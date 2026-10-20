import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeProject,
  exportProject,
  validProject,
} from "../shared/project.js";
const legacy = {
  band: "Prueba",
  event: "Montaje",
  notes: "",
  width: 10,
  depth: 8,
  items: [{ id: 78, type: "voice", label: "Voz", x: 30, y: 50 }],
  channels: [{ source: "Voz", mic: "SM58", stand: "Alto", notes: "" }],
};
export function annotated() {
  const s = normalizeProject(legacy);
  s.items[0].comment = "Dejar un metro al borde";
  s.columns.reverse();
  s.columns.push({ id: "c_patch", label: "Patch de escenario" });
  s.channels[0].c_patch = "A1";
  s.drawings.push({
    color: "#ff0000",
    points: [
      [0, 0],
      [50, 30],
      [100, 100],
    ],
  });
  s.positionComments.push({ x: 12, y: 65, text: "Paso de cable" });
  s.mountComments.push({
    author: "PA",
    text: "Revisar alimentación",
    createdAt: new Date().toISOString(),
  });
  return s;
}
test("migra archivos anteriores sin modificar el original", () => {
  const s = normalizeProject(legacy);
  assert.equal(s.formatVersion, 3);
  assert.equal(s.items[0].comment, "");
  assert.equal(legacy.formatVersion, undefined);
  assert.equal(s.channels[0].mic, "SM58");
});
test("JSON portable conserva columnas, trazos y comentarios", () => {
  const s = annotated();
  assert.deepEqual(normalizeProject(JSON.parse(exportProject(s))), s);
  assert.equal(validProject(s), true);
});
test("rechaza versiones desconocidas y anotaciones o columnas inválidas", () => {
  assert.throws(() => normalizeProject({ ...legacy, formatVersion: 99 }));
  for (const mutate of [
    (s) => (s.drawings[0].points[0][0] = -1),
    (s) => s.columns.push({ ...s.columns[0] }),
    (s) => (s.columns[0].id = "__proto__"),
    (s) => s.items.push({ ...s.items[0] }),
    (s) => (s.items[0].comment = {}),
    (s) => (s.positionComments[0].text = null),
  ]) {
    const s = annotated();
    mutate(s);
    assert.throws(() => normalizeProject(s));
  }
});
