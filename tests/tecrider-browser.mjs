import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createServer } from "../server/app.js";
import { getSymbol } from "../shared/symbols.js";
import { openDefault } from "./browser-helpers.mjs";
const directory = mkdtempSync(join(tmpdir(), "gordo-tecrider-"));
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
      viewport: { width: 1600, height: 1200 },
    }),
    b = await browser.newContext();
  for (const c of [a, b]) {
    c.setDefaultTimeout(15000);
    await c.route("https://fonts.googleapis.com/**", (r) => r.abort());
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
  await p.goto(base);
  await openDefault(p);
  await saved(p);
  await q.goto(base);
  await openDefault(q);
  await saved(q);
  await p.locator("#symbol-style").selectOption("tecrider");
  await saved(p);
  assert.equal(
    await p.locator('[data-item="3"] img').getAttribute("src"),
    getSymbol("guitar", "tecrider").src,
  );
  assert.equal(
    await p
      .locator('[data-item="3"] img')
      .evaluate((el) => getComputedStyle(el).filter),
    "none",
  );
  await p.locator("#symbol-category").selectOption("Todos");
  assert.equal(await p.locator("#symbol-tools [data-add]").count(), 309);
  await p
    .locator("#symbol-tools img")
    .evaluateAll((images) => Promise.all(images.map((img) => img.decode())));
  await p.locator("#symbol-search").fill("guitarra");
  assert.ok((await p.locator("#symbol-tools [data-add]").count()) > 10);
  await p.locator("#symbol-search").fill("");
  await p.locator("#symbol-category").selectOption("Cables y conectores");
  assert.ok((await p.locator("#symbol-tools [data-add]").count()) > 10);
  const first = p.locator("#symbol-tools [data-add]").first(),
    id = await first.getAttribute("data-add");
  await first.click();
  await saved(p);
  await q.waitForFunction(
    (id) =>
      [...document.querySelectorAll("#stage img")].some(
        (img) => img.getAttribute("src") === id,
      ),
    getSymbol(id, "tecrider").src,
  );
  await q
    .locator("#stage img")
    .last()
    .evaluate((img) => img.decode());
  const next = p.waitForEvent("download");
  await p.locator("#export").click();
  const download = await next;
  const json = JSON.parse(readFileSync(await download.path(), "utf8"));
  assert.equal(json.symbolStyle, "tecrider");
  assert.equal(json.formatVersion, 5);
  assert.equal(json.items.at(-1).type, id);
  await p.evaluate(
    () =>
      (window.print = () => {
        window.__printed = true;
      }),
  );
  await p.locator("#print").click();
  await p.locator("#pdf-export-all").click();
  await p.waitForFunction(() => window.__printed);
  assert.equal(
    await p.locator("#pdf-export-document #stage img.tecrider-symbol").count(),
    6,
  );
  await p.emulateMedia({ media: "print" });
  assert.ok((await p.pdf()).length > 10000);
  await p.emulateMedia({ media: "screen" });
  await p.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await p.reload();
  await openDefault(p);
  assert.equal(await p.locator("#symbol-style").inputValue(), "tecrider");
  await p.locator("#symbol-style").selectOption("generic");
  await saved(p);
  assert.match(
    await p.locator('[data-item="3"] img').getAttribute("src"),
    /electric_guitar.webp$/,
  );
  await p.locator("#symbol-style").selectOption("x32");
  await saved(p);
  assert.match(
    await p.locator('[data-item="3"] img').getAttribute("src"),
    /behringer\/20.svg$/,
  );
  assert.deepEqual(errors, []);
  console.log(
    "OK: 309 PNG locales, búsqueda en español, tres estilos, dos puestos, JSON, PDF y persistencia del catálogo TecRider.",
  );
} finally {
  await browser?.close();
  await app.close();
  rmSync(directory, { recursive: true, force: true });
}
