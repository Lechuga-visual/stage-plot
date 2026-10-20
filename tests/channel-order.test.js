import { test } from "node:test";
import assert from "node:assert/strict";
import { moveChannels } from "../shared/channel-order.js";
const channels = () =>
  ["Bombo", "Caja", "Bajo", "Teclados L", "Teclados R", "Voz"].map(
    (source, n) => ({
      source,
      patch: `A${n + 1}`,
      ...(n === 3 || n === 4
        ? {
            _link: { itemId: 2, inputId: "in_keys", side: n === 3 ? "L" : "R" },
          }
        : {}),
    }),
  );
test("mover selección discontinua conserva orden relativo, patch y vínculos", () => {
  const rows = channels(),
    result = moveChannels(rows, [1, 3, 4], 6);
  assert.deepEqual(
    result.map((c) => c.source),
    ["Bombo", "Bajo", "Voz", "Caja", "Teclados L", "Teclados R"],
  );
  assert.equal(result[4], rows[3]);
  assert.equal(result[4].patch, "A4");
  assert.equal(result[5]._link.side, "R");
  assert.deepEqual(
    rows.map((c) => c.source),
    ["Bombo", "Caja", "Bajo", "Teclados L", "Teclados R", "Voz"],
  );
});
test("mover hacia el principio, hacia abajo y dentro de la selección usa límites originales", () => {
  const rows = channels();
  assert.deepEqual(
    moveChannels(rows, [4, 5], 0).map((c) => c.source),
    ["Teclados R", "Voz", "Bombo", "Caja", "Bajo", "Teclados L"],
  );
  assert.deepEqual(
    moveChannels(rows, [0], 2).map((c) => c.source),
    ["Caja", "Bombo", "Bajo", "Teclados L", "Teclados R", "Voz"],
  );
  assert.deepEqual(moveChannels(rows, [1, 2], 2), rows);
  assert.equal(moveChannels(rows, [], 2), rows);
  assert.equal(moveChannels(rows, [0], -1), rows);
});
