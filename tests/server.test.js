import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import WebSocket from "ws";
import { createServer } from "../server/app.js";
const document = {
  band: "Banda",
  event: "Prueba",
  notes: "",
  width: 10,
  depth: 8,
  items: [],
  channels: [],
};
test("lectores, editores, difusión, conflictos y persistencia", async () => {
  const directory = mkdtempSync(join(tmpdir(), "stage-test-"));
  let app, ws;
  try {
    ({ app } = await createServer({ directory, editCode: "test-code" }));
    await app.listen({ port: 0, host: "127.0.0.1" });
    const base = `http://127.0.0.1:${app.server.address().port}`;
    ws = new WebSocket(base.replace("http", "ws") + "/live");
    await once(ws, "open");
    const put = (body, code = "test-code") =>
      app.inject({
        method: "PUT",
        url: "/api/project",
        headers: { "x-edit-code": code },
        payload: body,
      });
    assert.equal((await app.inject("/api/project")).json().canEdit, false);
    assert.equal(
      (await put({ revision: 0, document }, "wrong")).statusCode,
      403,
    );
    assert.equal(
      (await put({ revision: 0, document: { ...document, width: -1 } }))
        .statusCode,
      400,
    );
    const notification = once(ws, "message");
    assert.equal((await put({ revision: 0, document })).statusCode, 200);
    assert.equal(JSON.parse((await notification)[0]).revision, 1);
    const outcomes = await Promise.all([
      put({ revision: 1, document: { ...document, band: "A" } }),
      put({ revision: 1, document: { ...document, band: "B" } }),
    ]);
    assert.deepEqual(outcomes.map((r) => r.statusCode).sort(), [200, 409]);
    assert.equal((await app.inject("/api/project")).json().revision, 2);
    assert.equal(
      (
        await app.inject({
          method: "PUT",
          url: "/api/project",
          headers: {
            "x-edit-code": "test-code",
            origin: "http://evil.example",
            host: "localhost",
          },
          payload: { revision: 2, document },
        })
      ).statusCode,
      403,
    );
    ws.terminate();
    await app.close();
    ({ app } = await createServer({ directory, editCode: "test-code" }));
    const restored = (await app.inject("/api/project")).json();
    assert.equal(restored.revision, 2);
    assert.equal(restored.document.band, "A");
    assert.equal((await app.inject("/")).statusCode, 200);
  } finally {
    ws?.terminate();
    await app?.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
