import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { SYMBOLS, LEGACY_ALIASES, getSymbol } from "../shared/symbols.js";
import { normalizeProject, exportProject } from "../shared/project.js";

test("la única colección incluida contiene 180 conceptos y 720 SVG propios sin dependencias externas", () => {
  assert.equal(SYMBOLS.length, 180);
  assert.equal(new Set(SYMBOLS.map(s => s.id)).size, 180);
  assert.equal(new Set(SYMBOLS.map(s => s.category)).size, 14);
  assert.deepEqual(readdirSync("public/symbols"), ["gordostage"]);
  for (const view of ["original", "cenital"]) for (const theme of ["claro", "oscuro"]) {
    assert.equal(readdirSync(`public/symbols/gordostage/${view}/${theme}`).length, 180);
    for (const symbol of SYMBOLS) {
      const src = getSymbol(symbol.id, view, theme).src;
      assert.ok(existsSync("public" + src));
      const svg = readFileSync("public" + src, "utf8");
      assert.match(svg, /<svg[^>]+viewBox="0 0 100 100"/);
      assert.doesNotMatch(svg, /<image|<script|foreignObject|href=|url\(/i);
    }
  }
});

test("las dos vistas comparten conceptos y los ocho atajos del proyecto de ejemplo resuelven", () => {
  for (const [alias,id] of Object.entries(LEGACY_ALIASES)) {
    assert.equal(getSymbol(alias).id,id);
    assert.equal(getSymbol(alias,"cenital").id,id);
  }
  assert.equal(getSymbol("x32_55"),undefined);
  assert.equal(getSymbol("desconocido"),undefined);
  const p=normalizeProject({band:"Ejemplo",event:"Festival",notes:"",width:10,depth:8,items:[{id:1,type:"electric_guitar",label:"Guitarra principal",x:30,y:50}],channels:[]});
  p.symbolStyle="cenital";
  assert.deepEqual(normalizeProject(JSON.parse(exportProject(p))),p);
});
