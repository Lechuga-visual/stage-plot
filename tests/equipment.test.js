import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { SYMBOLS, getSymbol, LEGACY_ALIASES } from "../shared/symbols.js";
import { normalizeProject, exportProject } from "../shared/project.js";
import {
  newInput,
  technical,
  ensureTechnicalColumns,
  reconcileInputs,
  updateChannel,
  removeChannel,
} from "../shared/equipment.js";
function project() {
  return normalizeProject({
    band: "Prueba",
    event: "",
    notes: "",
    width: 10,
    depth: 8,
    items: [
      { id: 1, type: "double_keyboard_rig", label: "Teclados", x: 50, y: 50 },
    ],
    channels: [
      { source: "Voz existente", mic: "SM58", stand: "Alto", notes: "" },
    ],
  });
}
test("los 173 archivos originales tienen un ID único y cabecera WebP", () => {
  assert.equal(SYMBOLS.length, 173);
  assert.equal(new Set(SYMBOLS.map((s) => s.id)).size, 173);
  assert.equal(
    readdirSync("public/symbols/techrider").filter((f) => f.endsWith(".webp"))
      .length,
    173,
  );
  for (const s of SYMBOLS) {
    const path = "public" + s.src;
    assert.ok(existsSync(path), path);
    const bytes = readFileSync(path);
    assert.equal(bytes.subarray(0, 4).toString(), "RIFF");
    assert.equal(bytes.subarray(8, 12).toString(), "WEBP");
  }
  for (const id of Object.keys(LEGACY_ALIASES)) assert.ok(getSymbol(id));
});
test("mono y estéreo generan canales con micrófono, energía y phantom sin duplicar al guardar", () => {
  const s = project();
  const t = technical(s.items[0]);
  t.power = "mains";
  t.powerNotes = "230 V";
  const input = newInput("Piano");
  input.microphone = "DI estéreo";
  input.signal = "stereo";
  input.phantom = true;
  t.inputs.push(input);
  ensureTechnicalColumns(s);
  reconcileInputs(s);
  assert.equal(s.channels.length, 3);
  assert.deepEqual(
    s.channels.slice(1).map((c) => c.source),
    ["Piano L", "Piano R"],
  );
  assert.equal(s.channels[1].c_phantom, "Sí · 48 V");
  assert.match(s.channels[2].c_power, /230 V/);
  reconcileInputs(s);
  assert.equal(s.channels.length, 3);
  input.signal = "mono";
  reconcileInputs(s);
  assert.equal(s.channels.length, 2);
  assert.equal(s.channels[1].source, "Piano");
  assert.equal(s.channels[0].source, "Voz existente");
});
test("se puede vincular un canal existente y editar micrófono desde la tabla", () => {
  const s = project();
  const input = newInput("Voz existente");
  technical(s.items[0]).inputs.push(input);
  s.channels[0]._link = { itemId: 1, inputId: input.id, side: "M" };
  reconcileInputs(s);
  assert.equal(s.channels.length, 1);
  updateChannel(s, 0, "mic", "Beta 58");
  assert.equal(input.microphone, "Beta 58");
  assert.equal(s.channels[0].mic, "Beta 58");
  input.signal = "stereo";
  reconcileInputs(s);
  updateChannel(s, 0, "mic", "DI nueva");
  assert.equal(s.channels[1].mic, "DI nueva");
  assert.deepEqual(normalizeProject(JSON.parse(exportProject(s))), s);
});
test("eliminar una entrada borra su par, preserva canales manuales y rechaza enlaces falsos", () => {
  const s = project();
  const input = newInput("Piano");
  input.signal = "stereo";
  technical(s.items[0]).inputs.push(input);
  reconcileInputs(s);
  const fake = structuredClone(s);
  fake.channels[1]._link.inputId = "in_missing";
  assert.throws(() => normalizeProject(fake));
  const duplicate = structuredClone(s);
  duplicate.channels.push(structuredClone(duplicate.channels[1]));
  assert.throws(() => normalizeProject(duplicate));
  removeChannel(s, 1);
  assert.equal(s.channels.length, 1);
  assert.equal(s.items[0].technical.inputs.length, 0);
});
test("un proyecto v2 conserva columnas, dibujos y canales al migrar a v3", () => {
  const s = project();
  s.formatVersion = 2;
  delete s.items[0].technical;
  s.items[0].type = "keys";
  s.drawings.push({
    color: "#111111",
    points: [
      [1, 1],
      [2, 2],
    ],
  });
  const migrated = normalizeProject(s);
  assert.equal(migrated.formatVersion, 3);
  assert.deepEqual(migrated.drawings, s.drawings);
  assert.deepEqual(migrated.channels, s.channels);
  assert.equal(migrated.items[0].type, "keys");
});

test("convertir mono/estéreo conserva patch, posición y crea la pareja contigua", () => {
  const s = project();
  s.columns.push({ id: "c_patch", label: "Patch" });
  s.channels[0].c_patch = "A9";
  const input = newInput("Piano");
  technical(s.items[0]).inputs.push(input);
  s.channels[0]._link = { itemId: 1, inputId: input.id, side: "M" };
  reconcileInputs(s);
  s.channels.push({
    source: "Último",
    mic: "",
    stand: "",
    notes: "",
    c_patch: "B1",
  });
  input.signal = "stereo";
  reconcileInputs(s);
  assert.deepEqual(
    s.channels.map((c) => c.source),
    ["Piano L", "Piano R", "Último"],
  );
  assert.equal(s.channels[0].c_patch, "A9");
  input.signal = "mono";
  reconcileInputs(s);
  assert.deepEqual(
    s.channels.map((c) => c.source),
    ["Piano", "Último"],
  );
  assert.equal(s.channels[0].c_patch, "A9");
});
