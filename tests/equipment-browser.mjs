import { openDefault } from "./browser-helpers.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "../server/app.js";
const directory = mkdtempSync(join(tmpdir(), "stage-equipment-"));
const { app } = await createServer({
  localAdmin: false,
  directory,
  editCode: "equipment-test",
});
let browser;
try {
  await app.listen({ port: 0, host: "127.0.0.1" });
  const base = `http://127.0.0.1:${app.server.address().port}`;
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
  });
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  for (const context of contexts) {
    await context.route("https://fonts.googleapis.com/**", (r) => r.abort());
    await context.addInitScript(() =>
      sessionStorage.setItem("stagecraft-edit-code", "equipment-test"),
    );
  }
  const p = await contexts[0].newPage(),
    q = await contexts[1].newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  q.on("pageerror", (e) => errors.push(e.message));
  await p.goto(base);
  await openDefault(p);
  await p.locator("#chat-form").waitFor({ state: "attached" });
  const saved = () =>
    p.waitForFunction(
      () =>
        document.querySelector("#save-status")?.textContent ===
        "● Conectado · edición",
    );
  await saved();
  await q.goto(base);
  await openDefault(q);
  await q.locator("#chat-form").waitFor({ state: "attached" });
  await p.locator("#symbol-category").selectOption("Todos");
  assert.equal(await p.locator("[data-add]").count(), 173);
  assert.equal(
    await p.locator("#symbol-tools img").evaluateAll(async (imgs) =>
      (
        await Promise.all(
          imgs.map(async (img) => {
            try {
              await img.decode();
              return img.naturalWidth > 0;
            } catch {
              return false;
            }
          }),
        )
      ).every(Boolean),
    ),
    true,
  );
  await p.locator("#symbol-search").fill("foh");
  assert.equal(await p.locator("[data-add]").count(), 1);
  await p.locator('[data-add="foh_position"]').click();
  assert.equal(
    await p.locator('#stage img[src$="foh_position.webp"]').count(),
    1,
  );
  await saved();
  await p.locator("#symbol-search").fill("teclado doble");
  await p.locator('[data-add="double_keyboard_rig"]').click();
  await p.locator("#equipment-power").selectOption("mains");
  await p.locator("#power-notes").fill("230 V · 2 enchufes");
  await p.locator("#power-notes").press("Tab");
  await p.locator("#create-input").click();
  const field = (name) => p.locator(`[data-technical-field="${name}"]`).first();
  await field("name").fill("Teclado principal");
  await field("name").press("Tab");
  await field("microphone").fill("DI estéreo");
  await field("microphone").press("Tab");
  await field("signal").selectOption("stereo");
  await field("phantom").selectOption("true");
  await saved();
  let remote = (await (await fetch(base + "/api/project")).json()).document;
  const item = remote.items.find((i) => i.type === "double_keyboard_rig");
  assert.equal(item.technical.power, "mains");
  assert.equal(item.technical.inputs[0].signal, "stereo");
  assert.equal(remote.channels.length, 9);
  assert.deepEqual(
    remote.channels.filter((row) => row._link).map((row) => row.source),
    ["Teclado principal L", "Teclado principal R"],
  );
  await q.waitForFunction(() =>
    [...document.querySelectorAll("[data-channel]")].some(
      (el) => el.value === "Teclado principal R",
    ),
  );
  const micCell = p.locator("tbody tr").nth(7).locator('[data-field="mic"]');
  await micCell.fill("DI Radial");
  await micCell.press("Tab");
  await saved();
  assert.equal(await field("microphone").inputValue(), "DI Radial");
  assert.equal(
    await p
      .locator("tbody tr")
      .nth(8)
      .locator('[data-field="mic"]')
      .inputValue(),
    "DI Radial",
  );
  // Link an existing manual channel without creating a duplicate.
  await p.locator("#existing-channel").selectOption("0");
  await p.locator("#link-channel").click();
  await saved();
  remote = (await (await fetch(base + "/api/project")).json()).document;
  assert.equal(remote.channels.length, 9);
  assert.equal(
    remote.items.find((i) => i.id === item.id).technical.inputs.length,
    2,
  );
  const downloadPromise = p.waitForEvent("download");
  await p.locator("#export").click();
  const download = await downloadPromise;
  const exported = JSON.parse(readFileSync(await download.path(), "utf8"));
  assert.equal(exported.formatVersion, 5);
  assert.equal(
    exported.items.find((i) => i.id === item.id).technical.powerNotes,
    "230 V · 2 enchufes",
  );
  p.once("dialog", (d) => d.accept());
  await p.locator("#import-file").setInputFiles({
    name: "rider.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(exported)),
  });
  await saved();
  await p.locator(`[data-item="${item.id}"]`).click();
  assert.equal(await field("microphone").inputValue(), "DI Radial");
  await p.emulateMedia({ media: "print" });
  assert.equal(await p.locator(".equipment-panel").isVisible(), false);
  assert.equal(await p.locator(".equipment-summary").isVisible(), true);
  assert.ok((await p.pdf()).length > 10000);
  await p.emulateMedia({ media: "screen" });
  // Deleting equipment removes only its linked channels, after confirmation.
  p.once("dialog", (d) => d.accept());
  await p.locator("#delete-item").click();
  await saved();
  remote = (await (await fetch(base + "/api/project")).json()).document;
  assert.equal(remote.channels.length, 6);
  assert.equal(
    remote.items.some((i) => i.id === item.id),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    "OK: 173 WebP, búsqueda, recursos de producción, datos técnicos, canales L/R, energía/phantom, vínculo existente, edición bidireccional, JSON, PDF y segundo editor.",
  );
} finally {
  await browser?.close();
  await app.close();
  rmSync(directory, { recursive: true, force: true });
}
