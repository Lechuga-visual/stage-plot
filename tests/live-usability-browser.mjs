import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createServer } from "../server/app.js";
import { normalizeProject } from "../shared/project.js";
import { newInput } from "../shared/equipment.js";
import { openDefault } from "./browser-helpers.mjs";
const directory = mkdtempSync(join(tmpdir(), "gordo-usability-"));
const { app } = await createServer({ directory });
let browser;
try {
  const guitar = newInput("Guitarra"),
    keys = newInput("Teclados");
  keys.signal = "stereo";
  const seed = normalizeProject({
    band: "Prueba en directo",
    event: "",
    notes: "",
    width: 10,
    depth: 8,
    items: [
      {
        id: 1,
        type: "guitar",
        label: "Guitarra",
        x: 70,
        y: 50,
        technical: { power: "mains", powerNotes: "", inputs: [guitar] },
      },
      {
        id: 2,
        type: "keys",
        label: "Teclados",
        x: 25,
        y: 25,
        technical: { power: "mains", powerNotes: "", inputs: [keys] },
      },
    ],
    channels: ["Bombo", "Caja", "Bajo", "Guitarra", "Voz"].map((source, n) => ({
      source,
      mic: "",
      stand: "",
      notes: "",
      c_patch: `A${n + 1}`,
      ...(n === 3
        ? { _link: { itemId: 1, inputId: guitar.id, side: "M" } }
        : {}),
    })),
  });
  seed.columns.push({ id: "c_patch", label: "Patch" });
  seed.channels.forEach((row, n) => (row.c_patch = `A${n + 1}`));
  assert.equal(
    (
      await app.inject({
        method: "PUT",
        url: "/api/project",
        payload: { revision: 0, document: seed },
      })
    ).statusCode,
    200,
  );
  await app.listen({ port: 0, host: "127.0.0.1" });
  const base = `http://127.0.0.1:${app.server.address().port}`;
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
  });
  const a = await browser.newContext({
      viewport: { width: 1600, height: 1100 },
    }),
    b = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
  for (const c of [a, b]) {
    c.setDefaultTimeout(15000);
    await c.route("https://fonts.googleapis.com/**", (r) => r.abort());
    await c.addInitScript(() => {
      window.__notificationTones = 0;
      const create = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function (...args) {
        window.__notificationTones++;
        return create.apply(this, args);
      };
    });
  }
  const p = await a.newPage(),
    q = await b.newPage(),
    errors = [];
  for (const page of [p, q])
    page.on("pageerror", (e) => errors.push(e.message));
  const saved = (page) =>
    page.waitForFunction(
      () =>
        document.querySelector("#save-status")?.textContent ===
        "● Conectado · edición",
    );
  const stored = async () =>
    (await (await fetch(base + "/api/project")).json()).document;
  await p.goto(base);
  await p.locator("#welcome-network code").waitFor();
  assert.equal(await p.locator("#header-network code").textContent(), base);
  assert.equal(await p.locator("#welcome-network code").innerText(), base);
  assert.equal(
    (await (await fetch(base + "/api/network")).json()).port,
    app.server.address().port,
  );
  await openDefault(p);
  await saved(p);
  await q.goto(base);
  await openDefault(q, { role: "Monitores" });
  await saved(q);
  await q.locator("#toggle-chat").click();
  await q.locator("#chat-sound").click();
  await q.locator("#chat-sound").click();
  const ready = q.waitForResponse((r) => r.url().endsWith("/api/chat"));
  await q.locator("#toggle-chat").click();
  await ready;
  await p.locator("#toggle-chat").click();
  await p.locator("#chat-text").fill("Línea uno");
  await p.locator("#chat-text").press("Shift+Enter");
  await p.locator("#chat-text").pressSequentially("Línea dos");
  assert.equal((await (await fetch(base + "/api/chat")).json()).length, 0);
  await p.locator("#chat-text").press("Enter");
  await q.waitForFunction(
    () => document.querySelector("#chat-unread")?.textContent === "1",
  );
  assert.equal(
    await q
      .locator("#chat-dock")
      .evaluate((el) => el.classList.contains("has-unread")),
    true,
  );
  await q.waitForFunction(() => window.__notificationTones === 2);
  assert.equal(await p.locator("#chat-text").inputValue(), "");
  assert.equal(await p.evaluate(() => window.__notificationTones), 0);
  assert.equal(
    (await (await fetch(base + "/api/chat")).json())[0].text,
    "Línea uno\nLínea dos",
  );
  await q.locator("#chat-sound").click();
  const tones = await q.evaluate(() => window.__notificationTones);
  await p.locator("#chat-text").fill("Segundo aviso silenciado");
  await p.locator("#chat-text").press("Enter");
  await q.waitForFunction(
    () => document.querySelector("#chat-unread")?.textContent === "2",
  );
  assert.equal(await q.evaluate(() => window.__notificationTones), tones);
  await q.reload();
  await openDefault(q, { role: "Monitores" });
  assert.equal(
    await q.locator("#chat-sound").getAttribute("aria-pressed"),
    "false",
  );
  await p.locator("#toggle-chat").click();
  await p.locator('[data-item="1"]').click();
  p.once("dialog", (d) => d.dismiss());
  await p.locator("#tool-erase-stroke").click();
  assert.equal((await stored()).items.length, 2);
  p.once("dialog", (d) => {
    assert.match(d.message(), /canales vinculados/);
    return d.accept();
  });
  await p.locator("#tool-erase-stroke").click();
  await saved(p);
  assert.equal((await stored()).items.length, 1);
  assert.equal(
    (await stored()).channels.some((c) => c._link?.itemId === 1),
    false,
  );
  assert.equal(
    (await stored()).channels.filter((c) => c._link?.itemId === 2).length,
    2,
  );
  await p.locator('[data-tab="channels"]').click();
  const initial = (await stored()).channels.map((c) => c.source);
  await p.locator('[data-row-select="1"]').check();
  await p.locator('[data-row-select="3"]').check();
  let rows = p.locator("tbody tr");
  const target = rows.last().locator("td").first();
  const r = await target.boundingBox();
  await rows
    .nth(1)
    .locator("[data-drag-channel]")
    .first()
    .dragTo(target, { targetPosition: { x: 15, y: r.height - 2 } });
  await saved(p);
  assert.deepEqual(
    (await stored()).channels.map((c) => c.source),
    [initial[0], initial[2], initial[4], initial[5], initial[1], initial[3]],
  );
  assert.match(await p.locator("#channel-selection-count").innerText(), /^2 /);
  // Dragging an unselected row from its trailing handle moves just that row.
  await p.locator("#clear-channel-selection").click();
  rows = p.locator("tbody tr");
  await rows
    .last()
    .locator("[data-drag-channel]")
    .last()
    .dragTo(rows.first().locator("td").last(), {
      targetPosition: { x: 15, y: 2 },
    });
  await saved(p);
  assert.equal((await stored()).channels[0].source, initial[3]);
  assert.equal((await stored()).channels[0].c_patch, "A5");
  // Selection can also be moved with keyboard-accessible controls.
  await p.locator("#clear-channel-selection").click();
  await p.locator('[data-row-select="0"]').check();
  await p.locator("#channel-destination").selectOption("6");
  await p.locator("#move-channel-selection").click();
  await saved(p);
  assert.equal((await stored()).channels.at(-1).source, initial[3]);
  await p.locator('[data-tab="plot"]').click();
  await p.locator('[data-item="2"]').click();
  await p.locator('[data-technical-field="signal"]').selectOption("custom");
  await p.locator("[data-channel-count]").fill("4");
  await p.locator("[data-channel-count]").press("Tab");
  for (const [n, label] of [
    "Click",
    "Pistas L",
    "Pistas R",
    "Guía",
  ].entries()) {
    await p.locator(`[data-channel-label="${n}"]`).fill(label);
    await p.locator(`[data-channel-label="${n}"]`).press("Tab");
  }
  await saved(p);
  assert.deepEqual(
    (await stored()).items[0].technical.inputs[0].channelLabels,
    ["Click", "Pistas L", "Pistas R", "Guía"],
  );
  assert.equal(
    (await stored()).channels.filter((c) => c._link?.itemId === 2).length,
    4,
  );
  await q.waitForFunction(() =>
    [...document.querySelectorAll('tbody [data-field="source"]')].some(
      (el) => el.value === "Guía",
    ),
  );
  p.once("dialog", (d) => d.dismiss());
  await p.locator("[data-channel-count]").fill("2");
  await p.locator("[data-channel-count]").press("Tab");
  assert.equal(await p.locator("[data-channel-count]").inputValue(), "4");
  const downloadPromise = p.waitForEvent("download");
  await p.locator("#export").click();
  const download = await downloadPromise;
  const { readFileSync } = await import("node:fs");
  const portable = JSON.parse(readFileSync(await download.path(), "utf8"));
  assert.equal(portable.formatVersion, 6);
  assert.equal(portable.items[0].technical.inputs[0].channelLabels[3], "Guía");
  await p.emulateMedia({ media: "print" });
  assert.match(await p.locator(".equipment-summary").innerText(), /Guía/);
  assert.ok((await p.pdf()).length > 10000);
  await p.emulateMedia({ media: "screen" });
  await p.locator('[data-tab="channels"]').click();
  await p.locator('[data-tab="plot"]').click();
  await p.locator("#symbol-style").selectOption("cenital");
  await saved(p);
  assert.match(
    await p.locator('[data-item="2"] img').getAttribute("src"),
    /gordostage\/cenital\/oscuro\/single_keyboard_rig.svg$/,
  );
  await p.locator("#symbol-category").selectOption("Todos");
  assert.equal(await p.locator("#symbol-tools [data-add]").count(), 180);
  await p
    .locator("#symbol-tools img")
    .evaluateAll((images) => Promise.all(images.map((img) => img.decode())));
  await p.locator('[data-add="trs_connector"]').click();
  await saved(p);
  await q.waitForFunction(
    () => document.querySelector("#symbol-style")?.value === "cenital",
  );
  assert.equal((await stored()).symbolStyle, "cenital");
  const connector = (await stored()).items.find((i) => i.type === "trs_connector");
  assert.ok(connector);
  // The native print dialog is intercepted so the generated document can be inspected.
  await p.evaluate(
    () =>
      (window.print = () => {
        window.__printRequests = (window.__printRequests || 0) + 1;
      }),
  );
  await p.locator("#print").click();
  for (const key of ["channels", "equipment", "positions", "mounting", "notes"])
    await p.locator(`[data-pdf-section="${key}"]`).uncheck();
  for (const key of ["icons", "labels", "grid"])
    await p.locator(`[data-pdf-detail="${key}"]`).uncheck();
  await p.locator(`[data-pdf-item="${connector.id}"]`).uncheck();
  await p.locator("#pdf-export-selected").click();
  await p.waitForFunction(() => window.__printRequests === 1);
  const printed = p.locator("#pdf-export-document");
  assert.equal(
    await printed.locator(".channel-section,.equipment-summary,.notes").count(),
    0,
  );
  assert.equal(await printed.locator(".instrument,.item-label").count(), 0);
  assert.equal(await printed.locator("[data-item]").count(), 1);
  assert.equal(await p.locator("#app [data-item]").count(), 2);
  await p.emulateMedia({ media: "print" });
  assert.equal(await printed.isVisible(), true);
  assert.equal(await p.locator("#app").isVisible(), false);
  assert.equal(
    await printed
      .locator("#stage")
      .evaluate((el) => getComputedStyle(el).backgroundImage),
    "none",
  );
  assert.ok((await p.pdf()).length > 5000);
  await p.emulateMedia({ media: "screen" });
  await p.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  assert.equal(await printed.count(), 0);
  await p.locator("#print").click();
  await p.locator('[data-pdf-items="none"]').click();
  await p.locator("#pdf-export-all").click();
  await p.waitForFunction(() => window.__printRequests === 2);
  assert.equal(await printed.locator("[data-item]").count(), 2);
  assert.equal(await printed.locator(".instrument").count(), 2);
  assert.equal(await printed.locator("tbody tr").count(), 8);
  await p.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  // Every label participates above all equipment icons, even on overlapping items.
  assert.equal(
    await p
      .locator("#app [data-item]")
      .first()
      .evaluate((el) => getComputedStyle(el).transform),
    "none",
  );
  assert.ok(
    await p
      .locator("#app .item-label")
      .first()
      .evaluate(
        (el) =>
          Number(getComputedStyle(el).zIndex) >
          Number(
            getComputedStyle(document.querySelector("#app .instrument")).zIndex,
          ),
      ),
  );
  await p.locator('[data-tab="channels"]').click();
  const size = () =>
    p
      .locator('tbody [data-field="source"]')
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  const before = await size();
  await p.locator("#text-larger").click();
  await p.locator("#text-larger").click();
  assert.ok((await size()) > before);
  assert.equal(await p.locator("#text-size-value").innerText(), "140%");
  assert.equal(await q.locator("#text-size-value").innerText(), "120%");
  await p.reload();
  await openDefault(p);
  assert.equal(await p.locator("#text-size-value").innerText(), "140%");
  for (let n = 0; n < 4; n++) await p.locator("#text-larger").click();
  await p.setViewportSize({ width: 390, height: 844 });
  await p.locator(".brand").click();
  assert.ok(
    await p.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await p.locator("#text-size-value").click();
  assert.equal(await p.locator("#text-size-value").innerText(), "120%");
  assert.deepEqual(errors, []);
  console.log(
    "OK: Enter/Shift+Enter, primer aviso, sonido real y mute persistente, papelera con confirmación, arrastre por ambos extremos, selección múltiple, vínculos/patch, fuentes independientes, dirección visible y grupos de canales personalizados en dos puestos, JSON, PDF configurable y 180 SVG propios por vista.",
  );
} finally {
  await browser?.close();
  await app.close();
  rmSync(directory, { recursive: true, force: true });
}
