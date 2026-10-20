import { chromium } from "playwright";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import { createServer } from "../server/app.js";
import { normalizeProject } from "../shared/project.js";

// Demo data only. Never connect to the user's running server or database.
const directory = mkdtempSync(join(tmpdir(), "stage-screenshots-"));
const editCode = randomBytes(16).toString("hex");
const { app } = await createServer({ directory, editCode });
let browser;
try {
  const document = normalizeProject({
    band: "Los Eléctricos",
    event: "Rider técnico · Gira de verano",
    width: 10,
    depth: 8,
    notes:
      "Monitores con mezcla independiente. Alimentación eléctrica a ambos lados del escenario. Mantener despejado el acceso lateral.",
    items: [
      { id: 1, type: "drums", label: "Batería", x: 50, y: 22 },
      { id: 2, type: "bass", label: "Bajo", x: 22, y: 48 },
      { id: 3, type: "guitar", label: "Guitarra", x: 78, y: 48 },
      { id: 4, type: "voice", label: "Voz principal", x: 50, y: 65 },
      { id: 5, type: "monitor", label: "Mix 1 · Voz", x: 50, y: 85 },
      { id: 6, type: "monitor", label: "Mix 2 · Bajo", x: 22, y: 85 },
      { id: 7, type: "monitor", label: "Mix 3 · Guitarra", x: 78, y: 85 },
    ],
    channels: [
      { source: "Bombo", mic: "Shure Beta 52", stand: "Corto", notes: "" },
      { source: "Caja", mic: "Shure SM57", stand: "Corto", notes: "" },
      {
        source: "Overhead L",
        mic: "Condensador",
        stand: "Alto",
        notes: "48 V",
      },
      {
        source: "Overhead R",
        mic: "Condensador",
        stand: "Alto",
        notes: "48 V",
      },
      {
        source: "Bajo",
        mic: "DI activa",
        stand: "—",
        notes: "Antes del amplificador",
      },
      { source: "Guitarra", mic: "Shure SM57", stand: "Corto", notes: "" },
      {
        source: "Voz principal",
        mic: "Shure SM58",
        stand: "Alto",
        notes: "Mix 1",
      },
    ],
  });
  document.items[0].comment =
    "Tarima de 2 × 2 m. Dejar acceso por detrás de la batería.";
  document.items[3].comment =
    "Voz al centro, a un metro del borde del escenario.";
  document.columns.push({ id: "c_patch", label: "Patch" });
  document.channels.forEach((c, n) => (c.c_patch = `A${n + 1}`));
  document.drawings.push({
    color: "#cc4433",
    points: [
      [7, 10],
      [7, 72],
      [12, 72],
    ],
  });
  document.positionComments.push({
    x: 9,
    y: 60,
    text: "Paso de cableado. Mantener libre durante el montaje.",
  });
  document.mountComments.push({
    author: "Producción",
    text: "Confirmar las tres mezclas de monitores antes de comenzar la prueba de sonido.",
    createdAt: "2026-10-19T18:00:00Z",
  });
  const headers = { "x-edit-code": editCode };
  const saved = await app.inject({
    method: "PUT",
    url: "/api/project",
    headers,
    payload: { revision: 0, document },
  });
  if (saved.statusCode !== 200)
    throw Error("No se pudo preparar la demostración");
  for (const [author, text] of [
    [
      "PA",
      "Input list revisado. Los siete canales están listos para la prueba.",
    ],
    ["Monitores", "Mix 1 para voz, mix 2 para bajo y mix 3 para guitarra."],
    ["Producción", "Dejamos libre el acceso lateral marcado en el plano."],
  ])
    await app.inject({
      method: "POST",
      url: "/api/chat",
      headers,
      payload: { author, text },
    });
  await app.listen({ port: 0, host: "127.0.0.1" });
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    deviceScaleFactor: 1,
    locale: "es-CL",
    timezoneId: "America/Santiago",
  });
  // Screenshots are reproducible offline, with the app's fallback fonts.
  await context.route("https://fonts.googleapis.com/**", (route) =>
    route.abort(),
  );
  await context.addInitScript(
    (code) => sessionStorage.setItem("stagecraft-edit-code", code),
    editCode,
  );
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${app.server.address().port}`);
  await page.locator("#chat-log article").nth(2).waitFor();
  await page.evaluate(() => document.fonts.ready);
  mkdirSync("docs/screenshots", { recursive: true });
  await page.screenshot({ path: "docs/screenshots/stage-plot.png" });
  await page.locator('[data-tab="channels"]').click();
  await page.screenshot({ path: "docs/screenshots/input-list.png" });
  await page.evaluate(() => {
    const group = document.createElement("div");
    group.id = "capture-montage";
    const mounting = document.querySelector(".mounting-section");
    mounting.before(group);
    group.append(mounting, document.querySelector(".chat-section"));
  });
  await page
    .locator("#capture-montage")
    .screenshot({ path: "docs/screenshots/montaje-chat.png" });
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    "Capturas generadas: stage-plot, input-list, montaje-chat (datos de ejemplo).",
  );
} finally {
  await browser?.close();
  await app.close();
  rmSync(directory, { recursive: true, force: true });
}
