import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createServer } from "../server/app.js";
import { getSymbol } from "../shared/symbols.js";
import { openDefault } from "./browser-helpers.mjs";
const directory = mkdtempSync(tmpdir() + "/gordo-own-");
const { app } = await createServer({ directory });
let browser;
try {
  await app.listen({ port:0, host:"127.0.0.1" });
  const base = `http://127.0.0.1:${app.server.address().port}`;
  browser = await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || "/usr/bin/chromium"});
  const a = await browser.newContext({viewport:{width:1600,height:1200}}), b = await browser.newContext();
  for (const [context, theme] of [[a,"warm"],[b,"neon"]]) {
    context.setDefaultTimeout(15000);
    await context.route("https://fonts.googleapis.com/**", r => r.abort());
    await context.addInitScript(theme => { localStorage.setItem("gordostage-theme",theme);localStorage.setItem("gordostage-chat-minimized","true"); },theme);
  }
  const p = await a.newPage(), q = await b.newPage(), errors = [];
  for (const page of [p,q]) page.on("pageerror",e=>errors.push(e.message));
  const saved = page => page.waitForFunction(()=>document.querySelector("#save-status")?.textContent==="● Conectado · edición");
  await p.goto(base);await openDefault(p);await saved(p);
  await q.goto(base);await openDefault(q);await saved(q);
  assert.equal(await p.locator("#symbol-style option").count(),2);
  for (const view of ["original","cenital"]) {
    await p.locator("#symbol-style").selectOption(view);await saved(p);
    await q.waitForFunction(view=>document.querySelector("#symbol-style")?.value===view,view);
    assert.equal(await p.locator('[data-item="3"] img').getAttribute("src"),getSymbol("guitar",view,"claro").src);
    assert.equal(await q.locator('[data-item="3"] img').getAttribute("src"),getSymbol("guitar",view,"oscuro").src);
    await p.locator("#symbol-category").selectOption("Todos");
    await q.locator("#symbol-category").selectOption("Todos");
    for (const page of [p,q]) {
      assert.equal(await page.locator("#symbol-tools [data-add]").count(),180);
      await page.locator("#symbol-tools img").evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
    }
  }
  await p.locator("#symbol-search").fill("cencerro");
  assert.equal(await p.locator("#symbol-tools [data-add]").count(),1);
  await p.locator('[data-add="cowbell"]').click();await saved(p);
  await q.waitForFunction(()=>document.querySelectorAll("#stage [data-item]").length===6);
  await p.evaluate(()=>{window.print=()=>{window.__printed=true;};});
  await p.locator("#print").click();await p.locator("#pdf-export-all").click();
  await p.waitForFunction(()=>window.__printed);
  const images = p.locator("#pdf-export-document #stage img.builtin-symbol");
  assert.equal(await images.count(),6);
  for(const src of await images.evaluateAll(imgs=>imgs.map(img=>img.getAttribute("src")))) assert.match(src,/\/cenital\/claro\//);
  await p.emulateMedia({media:"print"});assert((await p.pdf()).length>10000);
  await p.emulateMedia({media:"screen"});await p.evaluate(()=>window.dispatchEvent(new Event("afterprint")));
  const next = p.waitForEvent("download");await p.locator("#export").click();
  const data=JSON.parse(readFileSync(await (await next).path(),"utf8"));
  assert.equal(data.formatVersion,6);assert.equal(data.symbolStyle,"cenital");assert.equal(data.items.at(-1).type,"cowbell");
  await p.reload();await openDefault(p);assert.equal(await p.locator("#symbol-style").inputValue(),"cenital");
  await p.locator("#theme-toggle").click();
  assert.match(await p.locator('[data-item="3"] img').getAttribute("src"),/\/cenital\/oscuro\//);
  assert.equal(await p.locator('[data-item="3"] img').evaluate(img=>getComputedStyle(img).filter),"none");
  assert.equal((await fetch(base+"/symbols/techrider/cajon.webp")).status,404);
  assert.deepEqual(errors,[]);
  console.log("OK: 720 SVG propios legibles, dos vistas, tema por puesto, PDF claro, JSON v6, persistencia y ausencia de la colección retirada.");
} finally { await browser?.close();await app.close();rmSync(directory,{recursive:true,force:true}); }
