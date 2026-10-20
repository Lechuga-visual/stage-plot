import { chromium } from "playwright";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openDefault } from "../tests/browser-helpers.mjs";
import { createServer } from "../server/app.js";
import {
  ensureTechnicalColumns,
  reconcileInputs,
  newInput,
} from "../shared/equipment.js";
import { normalizeProject } from "../shared/project.js";

// Demo data only. Never connect to the user's running server or database.
const directory = mkdtempSync(join(tmpdir(), "stage-screenshots-"));
const { app } = await createServer({ directory });
let browser;
try {
  const document = normalizeProject({
    band: "Los Eléctricos",
    description: "Escenario principal · Gira de verano · 9 canales",
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
    color: "#48d8ff",
    kind: "ethernet",
    width: 3,
    opacity: 0.9,
    label: "FOH → stagebox",
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
  // Demo equipment shares channels with the input list, including a stereo keyboard.
  const voice = document.items.find((item) => item.type === "voice");
  const voiceInput = newInput("Voz principal");
  voiceInput.microphone = "Shure SM58";
  voiceInput.stand = "Alto";
  voice.technical.inputs.push(voiceInput);
  document.channels[6]._link = {
    itemId: voice.id,
    inputId: voiceInput.id,
    side: "M",
  };
  const keys = {
    id: 8,
    type: "double_keyboard_rig",
    label: "Teclados",
    x: 22,
    y: 22,
    comment: "Alimentación detrás del soporte. Dos salidas balanceadas.",
    technical: { power: "mains", powerNotes: "230 V · 2 enchufes", inputs: [] },
  };
  const keysInput = newInput("Teclados");
  keysInput.microphone = "DI estéreo";
  keysInput.signal = "stereo";
  keysInput.phantom = true;
  keysInput.notes = "Salidas L/R";
  keys.technical.inputs.push(keysInput);
  document.items.push(keys);
  ensureTechnicalColumns(document);
  reconcileInputs(document);
  const headers = {};
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
  const secondProject = await app.inject({
    method: "POST",
    url: "/api/projects",
    payload: {
      document: normalizeProject({
        ...document,
        band: "Festival del Puerto",
        description: "Escenario B · Jornada del sábado · Backline compartido",
      }),
    },
  });
  await app.inject({
    method: "POST",
    url: "/api/profiles",
    payload: {
      name: "Equipo de escenario",
      role: "Escenario",
      permission: "editor",
    },
  });
  await app.listen({ port: 0, host: "127.0.0.1" });
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1440 },
    deviceScaleFactor: 1,
    locale: "es-CL",
    timezoneId: "America/Santiago",
  });
  // Screenshots are reproducible offline, with the app's fallback fonts.
  await context.route("https://fonts.googleapis.com/**", (route) =>
    route.abort(),
  );
  await context.addInitScript((secondId) => {
    localStorage.setItem("gordostage-chat-minimized", "true");
    localStorage.setItem(
      "gordostage-open-projects",
      JSON.stringify(["default", secondId]),
    );
  }, secondProject.json().id);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${app.server.address().port}`);
  await page.locator('[data-home-open="default"]').waitFor();
  mkdirSync("docs/screenshots", { recursive: true });
  await page.screenshot({ path: "docs/screenshots/bienvenida.png" });
  await page.locator("#home-security").click();
  await page.locator("#server-port").waitFor();
  await page.locator("#workspace-dialog").screenshot({path:"docs/screenshots/configuracion-puerto.png"});
  await page.locator("#workspace-dialog [data-dismiss]").click();

  await openDefault(page);
  await page.evaluate(() => document.fonts.ready);
  mkdirSync("docs/screenshots", { recursive: true });
  await page
    .locator("#stage img")
    .evaluateAll((imgs) => Promise.all(imgs.map((img) => img.decode())));
  await page.screenshot({ path: "docs/screenshots/stage-plot.png" });
  await page.locator("#symbol-category").selectOption("Producción, RF y vídeo");
  await page
    .locator("#symbol-tools img")
    .evaluateAll((imgs) => Promise.all(imgs.map((img) => img.decode())));
  await page
    .locator(".palette")
    .evaluate((el) => (el.style.alignSelf = "start"));
  await page
    .locator(".palette")
    .screenshot({ path: "docs/screenshots/biblioteca-simbolos.png" });
  await page.locator("#symbol-category").selectOption("Frecuentes");
  await page.locator('[data-item="8"]').click();
  await page
    .locator(".equipment-panel")
    .screenshot({ path: "docs/screenshots/ficha-tecnica.png" });
  await page.locator('[data-tab="channels"]').click();
  await page.screenshot({ path: "docs/screenshots/input-list.png" });
  await page.locator('[data-tab="plot"]').click();
  await page.locator("#toggle-chat").click();
  await page.locator("#chat-log article").nth(2).waitFor();
  await page.locator("#stage").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "docs/screenshots/montaje-chat.png" });
  await page.locator("#toggle-chat").click();
  await page.locator('[data-project="default"]').hover();
  await page.screenshot({ path: "docs/screenshots/proyectos.png" });
  await page.locator("#print").click();
  await page
    .locator("#workspace-dialog")
    .screenshot({ path: "docs/screenshots/exportacion-pdf.png" });
  await page.locator("#workspace-dialog [data-dismiss]").click();
  await page.locator("#symbol-style").selectOption("original");
  await page.locator("#symbol-category").selectOption("Todos");
  await page
    .locator("#symbol-tools img")
    .evaluateAll((images) => Promise.all(images.map((img) => img.decode())));
  await page
    .locator(".palette")
    .evaluate((el) => (el.style.alignSelf = "start"));
  await page
    .locator(".palette")
    .screenshot({ path: "docs/screenshots/iconos-gordostage-original.png" });
  await page.locator('[data-item="8"]').click();
  await page.locator('[data-technical-field="signal"]').selectOption("custom");
  await page.locator("[data-channel-count]").fill("4");
  await page.locator("[data-channel-count]").press("Tab");
  for (const [n, label] of [
    "Piano L",
    "Piano R",
    "Pads L",
    "Pads R",
  ].entries()) {
    await page.locator(`[data-channel-label="${n}"]`).fill(label);
    await page.locator(`[data-channel-label="${n}"]`).press("Tab");
  }
  await page
    .locator(".equipment-panel")
    .screenshot({ path: "docs/screenshots/canales-personalizados.png" });
  await page.locator("#symbol-style").selectOption("cenital");
  await page.locator("#symbol-category").selectOption("Cuerdas");
  await page
    .locator("#symbol-tools img")
    .evaluateAll((images) => Promise.all(images.map((img) => img.decode())));
  await page
    .locator(".palette")
    .evaluate((el) => (el.style.alignSelf = "start"));
  await page
    .locator(".palette")
    .screenshot({ path: "docs/screenshots/iconos-gordostage-cenital.png" });

  await page.locator("#header-network summary").click();
  await page.locator("#header-network .network-popover").screenshot({path:"docs/screenshots/acceso-en-red.png"});
  await page.keyboard.press("Escape");
  await page.locator("main .app-footer").screenshot({path:"docs/screenshots/creditos-version.png"});
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    "Capturas generadas: bienvenida, editor, lista, chat, proyectos, biblioteca, ficha técnica, PDF configurable, vistas original/cenital propias y canales personalizados (datos de ejemplo).",
  );
} finally {
  await browser?.close();
  await app.close();
  rmSync(directory, { recursive: true, force: true });
}
