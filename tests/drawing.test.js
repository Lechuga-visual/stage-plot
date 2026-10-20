import { test } from "node:test";
import assert from "node:assert/strict";
import { eraseCircle, eraseSweep, hitStroke } from "../shared/drawing.js";
const stroke = {
  points: [
    [0, 50],
    [100, 50],
  ],
  color: "#ff0000",
  kind: "audio",
  label: "Voz",
  width: 3,
  opacity: 0.3,
};
test("goma divide segmentos dispersos sin borrar el resto del trazo ni sus propiedades", () => {
  const parts = eraseCircle([stroke], [50, 50], 10, 100, 100);
  assert.equal(parts.length, 2);
  assert.deepEqual(parts[0].points, [
    [0, 50],
    [38.5, 50],
  ]);
  assert.deepEqual(parts[1].points, [
    [61.5, 50],
    [100, 50],
  ]);
  assert.equal(parts[0].opacity, 0.3);
  assert.equal(parts[1].kind, "audio");
  assert.equal(stroke.points.length, 2);
});
test("la goma barre el movimiento y respeta las dimensiones físicas del escenario", () => {
  const parts = eraseSweep([stroke], [30, 50], [70, 50], 5, 100, 100);
  assert.equal(parts.length, 2);
  assert.ok(parts[0].points.at(-1)[0] <= 25.001);
  assert.ok(parts[1].points[0][0] >= 74.999);
  assert.equal(hitStroke([stroke], [50, 52], 100, 100), 0);
  assert.equal(hitStroke([stroke], [50, 90], 100, 100), -1);
});
