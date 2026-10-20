import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  TECRIDER_SYMBOLS,
  ALL_SYMBOLS,
  getSymbol,
  getOriginalSymbol,
} from "../shared/symbols.js";
import { normalizeProject, exportProject } from "../shared/project.js";
test("TecRider incluye 309 PNG originales verificados, 11 categorías y procedencia", () => {
  const source = JSON.parse(
    readFileSync("public/symbols/tecrider/SOURCE.json", "utf8"),
  );
  assert.equal(TECRIDER_SYMBOLS.length, 309);
  assert.equal(source.assets.length, 309);
  assert.equal(new Set(TECRIDER_SYMBOLS.map((s) => s.category)).size, 11);
  assert.equal(ALL_SYMBOLS.length, 556);
  assert.equal(new Set(ALL_SYMBOLS.map((s) => s.id)).size, 556);
  for (const symbol of TECRIDER_SYMBOLS) {
    const bytes = readFileSync("public" + symbol.src),
      record = source.assets.find((a) => a.id === symbol.id);
    assert.deepEqual(
      [...bytes.subarray(0, 8)],
      [137, 80, 78, 71, 13, 10, 26, 10],
    );
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      record.sha256,
    );
    assert.ok(record.sources.length);
    assert.ok(symbol.label);
    assert.equal(getOriginalSymbol(symbol.id), symbol);
  }
});
test("los tres estilos conservan datos e IDs al exportar y migrar JSON", () => {
  const symbol = getSymbol("guitar", "tecrider");
  assert.equal(symbol.family, "tecrider");
  assert.equal(symbol.canonical, "electric_guitar");
  assert.equal(getSymbol(symbol.id, "x32").id, "x32_20");
  assert.equal(getSymbol(symbol.id, "generic").id, "electric_guitar");
  const p = normalizeProject({
    band: "Colores",
    event: "",
    notes: "",
    width: 10,
    depth: 8,
    symbolStyle: "tecrider",
    items: [{ id: 1, type: symbol.id, label: "Guitarra", x: 50, y: 50 }],
    channels: [],
  });
  assert.deepEqual(normalizeProject(JSON.parse(exportProject(p))), p);
  assert.equal(p.formatVersion, 5);
});
