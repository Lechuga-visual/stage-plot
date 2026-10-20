import { openDefault } from "./browser-helpers.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createServer } from "../server/app.js";
const directory = mkdtempSync(join(tmpdir(), "stage-browser-"));
const { app } = await createServer({
  localAdmin: false,
  directory,
  editCode: "browser-test",
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
  const errors = [];
  const context = async (editor) => {
    const c = await browser.newContext();
    await c.route("https://fonts.googleapis.com/**", (route) => route.abort());
    if (editor)
      await c.addInitScript(() => {
        sessionStorage.setItem("stagecraft-edit-code", "browser-test");
        localStorage.setItem("gordostage-chat-minimized", "true");
      });
    return c;
  };
  const a = await context(true),
    b = await context(true),
    r = await context(false);
  const p = await a.newPage(),
    q = await b.newPage(),
    reader = await r.newPage();
  for (const page of [p, q, reader])
    page.on("pageerror", (e) => errors.push(e.message));
  await p.goto(base);
  await openDefault(p);
  await p.locator("#chat-form").waitFor({ state: "attached" });
  const saved = async () => {
    await p.waitForFunction(
      () =>
        document.querySelector("#save-status")?.textContent ===
        "● Conectado · edición",
    );
  };
  await saved();
  await q.goto(base);
  await openDefault(q);
  await q.locator("#chat-form").waitFor({ state: "attached" });
  await reader.goto(base);
  await reader.locator("#home-security").waitFor();
  assert.equal(await reader.locator("#home-security").isDisabled(), true);
  assert.equal(await reader.locator("#home-users").isDisabled(), true);
  assert.ok(
    await reader
      .locator("#home-users")
      .evaluate((el) => Number(getComputedStyle(el).opacity) < 1),
  );
  await openDefault(reader, { identify: false });
  await reader.locator("#access-code").waitFor();
  assert.equal(await reader.locator("#chat-text").isDisabled(), true);
  assert.equal(await reader.locator("#band").isDisabled(), true);
  assert.equal(await reader.locator('[data-tool="draw"]').isDisabled(), true);
  await p.locator("#toggle-chat").click();
  await p.locator("#chat-text").fill("Revisar mezcla de voz");
  await p.locator("#chat-form button").click();
  await q.waitForFunction(() =>
    document
      .querySelector("#chat-log")
      ?.textContent.includes("Revisar mezcla de voz"),
  );
  await p.locator("#toggle-chat").click();
  p.once("dialog", (d) => d.accept("Patch escenario"));
  await p.locator("#add-column").click();
  await p.locator("th input").last().fill("Patch");
  await p.locator("tbody tr").first().locator("td input").last().fill("A1");
  await saved();
  await p.locator("[data-item]").first().click();
  await p.locator("#item-comment").fill("Dejar espacio para cableado");
  await saved();
  await p.locator('[data-tool="draw"]').click();
  const box = await p.locator("#stage").boundingBox();
  await p.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.2);
  await p.mouse.down();
  await p.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.35, {
    steps: 8,
  });
  await p.mouse.up();
  await saved();
  assert.equal(await p.locator(".drawing-layer polyline").count(), 1);
  await p.locator('[data-tool="comment"]').click();
  p.once("dialog", (d) => d.accept("Paso libre"));
  await p.locator("#stage").click({ position: { x: 100, y: 100 } });
  await saved();
  assert.equal(await p.locator(".comment-pin").count(), 1);
  await p.locator("#mount-text").fill("Canales listos");
  await p.locator("#mount-form button").click();
  await saved();
  await q.waitForFunction(() =>
    document
      .querySelector(".mounting-section")
      ?.textContent.includes("Canales listos"),
  );
  assert.equal(await q.locator(".drawing-layer polyline").count(), 1);
  assert.equal(await q.locator(".comment-pin").count(), 1);
  const downloadPromise = p.waitForEvent("download");
  await p.locator("#export").click();
  const download = await downloadPromise;
  const data = JSON.parse(readFileSync(await download.path(), "utf8"));
  assert.equal(data.formatVersion, 6);
  assert.equal(data.drawings.length, 1);
  assert.equal(data.columns.at(-1).label, "Patch");
  assert.equal(data.channels[0][data.columns.at(-1).id], "A1");
  assert.equal(data.items[0].comment, "Dejar espacio para cableado");
  assert.equal(data.positionComments[0].text, "Paso libre");
  assert.equal(data.mountComments[0].text, "Canales listos");
  assert.equal(Object.hasOwn(data, "chat"), false);
  p.once("dialog", (d) => d.accept());
  await p.locator("#import-file").setInputFiles({
    name: "rider.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ ...data, band: "Importado" })),
  });
  await saved();
  await q.waitForFunction(
    () => document.querySelector("#band")?.value === "Importado",
  );
  await p.emulateMedia({ media: "print" });
  assert.equal(await p.locator("#chat-dock").isVisible(), false);
  assert.equal(await p.locator(".annotation-section").isVisible(), true);
  assert.ok((await p.pdf()).length > 10000);
  const mobile = await context(false);
  const phone = await mobile.newPage();
  await phone.setViewportSize({ width: 390, height: 844 });
  await phone.goto(base);
  await openDefault(phone, { identify: false });
  await phone.locator("#access-code").waitFor();
  assert.equal(
    await phone.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    "OK: dos editores y lector, chat, columnas, dibujo, comentarios, JSON, PDF y vista móvil.",
  );
} finally {
  await browser?.close();
  await app.close();
  rmSync(directory, { recursive: true, force: true });
}
