import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "../server/app.js";
const directory = mkdtempSync(join(tmpdir(), "gordo-live-browser-"));
const { app } = await createServer({ directory });
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
  const a = await browser.newContext({
      viewport: { width: 1440, height: 1050 },
    }),
    b = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
  for (const c of [a, b]) {
    c.setDefaultTimeout(15000);
    await c.route("https://fonts.googleapis.com/**", (r) => r.abort());
  }
  const p = await a.newPage(),
    q = await b.newPage(),
    errors = [];
  for (const page of [p, q])
    page.on("pageerror", (error) => errors.push(error.message));
  const saved = (page) =>
    page.waitForFunction(
      () =>
        document.querySelector("#save-status")?.textContent ===
        "● Conectado · edición",
      null,
      { timeout: 15000 },
    );
  const identify = async (page, role) => {
    await page.locator("#identity-form").waitFor();
    await page.locator("#identity-role").selectOption(role);
    await page.locator("#identity-form button").click();
    await page.locator("#identity-form").waitFor({ state: "detached" });
    await saved(page);
  };
  const current = async (page) =>
    await page.evaluate(() => sessionStorage.getItem("gordostage-project"));
  const document = async (id) =>
    (
      await (
        await fetch(base + "/api/project", { headers: { "x-project-id": id } })
      ).json()
    ).document;
  await p.goto(base);
  await p.waitForFunction(
    () => document.querySelector("#home-security")?.disabled === false,
    null,
    { timeout: 15000 },
  );
  assert.equal(
    await p.locator("#welcome-page h1").innerText(),
    "Todo listo para el próximo show.",
  );
  assert.equal(await p.locator("html").getAttribute("data-theme"), "neon");
  assert.equal(await p.locator("#home-security").isEnabled(), true);
  await p.locator('[data-home-open="default"]').click();
  await identify(p, "FOH");
  assert.equal(await p.locator("#access-code").count(), 0);
  await p
    .locator("#project-description")
    .fill("Escenario principal · prueba de sonido");
  await saved(p);
  await p.locator('[data-project="default"]').hover();
  assert.match(
    await p.locator(".project-tooltip").first().innerText(),
    /Escenario principal/,
  );
  await p.locator("#browse-projects").click();
  await p.locator("#new-project-title").fill("Show nocturno");
  await p.locator("#create-project-form button").click();
  await identify(p, "Monitores");
  const projectId = await current(p);
  assert.notEqual(projectId, "default");
  await q.goto(base);
  await q.locator('[data-home-open="default"]').click();
  await identify(q, "Escenario");
  assert.notEqual(await current(q), projectId);
  assert.equal(await q.locator("#band").inputValue(), "Los Eléctricos");
  await p.locator("#event").fill("Montaje de noche");
  await saved(p);
  assert.equal(
    await q.locator("#event").inputValue(),
    "Rider técnico · Tour 2026",
  );
  await q.locator("#browse-projects").click();
  await q.locator(`[data-open-project="${projectId}"]`).click();
  await identify(q, "FOH");
  assert.equal(await q.locator("#event").inputValue(), "Montaje de noche");
  await p.locator("#toggle-chat").click();
  await q.locator("#toggle-chat").click();
  const chatName = await p.evaluate(
    () => JSON.parse(sessionStorage.getItem("gordostage-identity")).name,
  );
  assert.match(chatName, /Monitores/);
  await p.locator("#chat-text").fill("Monitores listos");
  await p.locator("#chat-form button").click();
  await q.waitForFunction(
    () =>
      document
        .querySelector("#chat-log")
        ?.textContent.includes("Monitores listos"),
    null,
    { timeout: 15000 },
  );
  assert.match(
    await q.locator("#chat-log").innerText(),
    new RegExp(chatName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
  await p.locator("#toggle-chat").click();
  await q.locator("#chat-text").fill("Recibido desde FOH");
  await q.locator("#chat-form button").click();
  await p.waitForFunction(
    () => Number(document.querySelector("#chat-unread")?.textContent) > 0,
    null,
    { timeout: 15000 },
  );
  await q.locator("#toggle-chat").click();
  const drawStage = async (page, from, to) => {
    await page.locator("#stage").scrollIntoViewIfNeeded();
    const r = await page.locator("#stage").boundingBox();
    await page.mouse.move(r.x + r.width * from[0], r.y + r.height * from[1]);
    await page.mouse.down();
    await page.mouse.move(r.x + r.width * to[0], r.y + r.height * to[1], {
      steps: 12,
    });
    await page.mouse.up();
    await saved(page);
  };
  await p.locator('[data-tool="draw"]').click();
  await p.locator("#draw-width").fill("12");
  await p.locator("#draw-opacity").evaluate((el) => {
    el.value = "25";
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await drawStage(p, [0.15, 0.55], [0.85, 0.55]);
  assert.equal((await document(projectId)).drawings[0].opacity, 0.25);
  await p.locator('[data-tool="erase"]').click();
  await drawStage(p, [0.5, 0.45], [0.5, 0.65]);
  assert.equal((await document(projectId)).drawings.length, 2);
  await p.locator("#undo-drawing").click();
  await saved(p);
  assert.equal((await document(projectId)).drawings.length, 1);
  await p.locator("#redo-drawing").click();
  await saved(p);
  assert.equal((await document(projectId)).drawings.length, 2);
  await p.locator('[data-tool="erase-stroke"]').click();
  await p.locator("#stage").scrollIntoViewIfNeeded();
  let r = await p.locator("#stage").boundingBox();
  await p
    .locator("#stage")
    .click({ position: { x: r.width * 0.3, y: r.height * 0.55 } });
  await saved(p);
  assert.equal((await document(projectId)).drawings.length, 1);
  await p.locator('[data-tool="cable"]').click();
  await p.locator("#cable-kind").selectOption("ethernet");
  await p.locator("#cable-label").fill("FOH → stagebox");
  await p.locator("#stage").scrollIntoViewIfNeeded();
  r = await p.locator("#stage").boundingBox();
  for (const point of [
    [0.2, 0.2],
    [0.4, 0.2],
    [0.4, 0.4],
  ])
    await p
      .locator("#stage")
      .click({ position: { x: r.width * point[0], y: r.height * point[1] } });
  await p.locator("#stage").press("Enter");
  await saved(p);
  assert.equal((await document(projectId)).drawings.at(-1).kind, "ethernet");
  assert.equal(
    (await document(projectId)).drawings.at(-1).label,
    "FOH → stagebox",
  );
  await p.locator("#symbol-file").setInputFiles({
    name: "mi-cajon.webp",
    mimeType: "image/webp",
    buffer: readFileSync("public/symbols/techrider/cajon.webp"),
  });
  await p.locator('[data-add^="custom_"]').waitFor();
  await p.locator('[data-tool="move"]').click();
  await p.locator('[data-add^="custom_"]').click();
  await saved(p);
  await q.waitForFunction(
    () => document.querySelector("#stage .custom-symbol"),
    null,
    { timeout: 15000 },
  );
  await q.locator("#stage .custom-symbol").evaluate((img) => img.decode());
  const downloadPromise = p.waitForEvent("download");
  await p.locator("#export").click();
  const downloaded = await downloadPromise;
  const portable = JSON.parse(readFileSync(await downloaded.path(), "utf8"));
  assert.equal(portable.formatVersion, 4);
  assert.equal(portable.customAssets.length, 1);
  assert.match(portable.customAssets[0].dataUrl, /^data:image\/webp;base64,/);
  assert.equal(portable.drawings.at(-1).kind, "ethernet");
  await p.locator(".brand").click();
  assert.equal(await p.locator("#welcome-page").isVisible(), true);
  await p.locator("#theme-select").selectOption("warm");
  assert.equal(await p.locator("html").getAttribute("data-theme"), "warm");
  assert.equal(await q.locator("html").getAttribute("data-theme"), "neon");
  await p.locator("#home-users").click();
  await p.locator("#profile-name").fill("Invitado de producción");
  await p.locator("#profile-role").selectOption("Producción");
  await p.locator("#profile-permission").selectOption("viewer");
  await p.locator("#profile-pin").fill("4321");
  await p.locator("#profile-form button").click();
  await p.locator(".registered-users article").waitFor();
  await p.locator("#workspace-dialog [data-dismiss]").click();
  await q.locator("#identity-button").click();
  const profile = await (await fetch(base + "/api/profiles")).json();
  await q.locator("#identity-profile").selectOption(profile[0].id);
  await q.locator("#identity-pin").fill("4321");
  await q.locator("#identity-form button").click();
  await q.waitForFunction(
    () => document.querySelector("#band")?.disabled === true,
    null,
    { timeout: 15000 },
  );
  assert.equal(await q.locator('[data-tool="draw"]').isDisabled(), true);
  await p.locator("#home-security").click();
  await p.locator("#security-enabled").check();
  await p.locator("#security-code").fill("segura123");
  await p.locator("#security-form button").click();
  assert.equal(
    (await (await fetch(base + "/api/security")).json()).securityEnabled,
    true,
  );
  await p.locator('[data-home-open="default"]').click();
  await saved(p);
  assert.equal(await p.locator("#band").isDisabled(), false);
  assert.equal(await current(q), projectId);
  assert.deepEqual(errors, []);
  console.log(
    "OK: bienvenida, temas independientes, proyectos/hover, roles, chat flotante, borrado parcial, deshacer/rehacer, opacidad, cableado, subida compartida, JSON y permisos.",
  );
} finally {
  await browser?.close();
  await app.close();
  rmSync(directory, { recursive: true, force: true });
}
