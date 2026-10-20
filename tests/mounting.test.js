import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import WebSocket from "ws";
import { createServer } from "../server/app.js";
import { normalizeProject, exportProject } from "../shared/project.js";
test("chat privado persistente, notificaciones y transferencia de proyecto entre servidores", async () => {
  const directory = mkdtempSync(join(tmpdir(), "stage-mount-"));
  let app, other, ws;
  try {
    ({ app } = await createServer({
      localAdmin: false,
      directory: join(directory, "one"),
      editCode: "editor",
    }));
    await app.listen({ port: 0, host: "127.0.0.1" });
    const send = (app, method, url, payload, auth = true) =>
      app.inject({
        method,
        url,
        payload,
        headers: auth ? { "x-edit-code": "editor" } : {},
      });
    assert.equal(
      (await send(app, "GET", "/api/chat", undefined, false)).statusCode,
      403,
    );
    assert.equal(
      (
        await send(
          app,
          "POST",
          "/api/chat",
          { author: "PA", text: "No permitido" },
          false,
        )
      ).statusCode,
      403,
    );
    assert.equal(
      (await send(app, "POST", "/api/chat", { author: "", text: "Hola" }))
        .statusCode,
      400,
    );
    ws = new WebSocket(`ws://127.0.0.1:${app.server.address().port}/live`);
    await once(ws, "open");
    const notification = once(ws, "message");
    assert.equal(
      (
        await send(app, "POST", "/api/chat", {
          author: "PA",
          text: "Revisar batería",
        })
      ).statusCode,
      201,
    );
    assert.deepEqual(JSON.parse((await notification)[0]), {
      type: "chat",
      projectId: "default",
    });
    assert.equal(
      (await send(app, "GET", "/api/chat")).json()[0].text,
      "Revisar batería",
    );
    assert.equal((await app.inject("/api/project")).json().revision, 0);
    const document = normalizeProject({
      band: "Banda",
      event: "Prueba",
      notes: "",
      width: 10,
      depth: 8,
      items: [],
      channels: [],
    });
    document.columns.push({ id: "c_patch", label: "Patch" });
    document.channels.push({
      source: "Voz",
      mic: "SM58",
      stand: "Alto",
      notes: "",
      c_patch: "A3",
    });
    document.drawings.push({
      color: "#123456",
      opacity: 1,
      width: 3,
      kind: "free",
      label: "",
      points: [
        [20, 20],
        [80, 80],
      ],
    });
    document.positionComments.push({ text: "Pasillo libre", x: 40, y: 60 });
    document.mountComments.push({
      author: "PA",
      text: "Listo",
      createdAt: new Date().toISOString(),
    });
    assert.equal(
      (await send(app, "PUT", "/api/project", { revision: 0, document }))
        .statusCode,
      200,
    );
    const portable = JSON.parse(
      exportProject((await app.inject("/api/project")).json().document),
    );
    ({ app: other } = await createServer({
      localAdmin: false,
      directory: join(directory, "two"),
      editCode: "editor",
    }));
    assert.equal(
      (
        await send(other, "PUT", "/api/project", {
          revision: 0,
          document: portable,
        })
      ).statusCode,
      200,
    );
    assert.deepEqual(
      (await other.inject("/api/project")).json().document,
      document,
    );
    assert.deepEqual((await send(other, "GET", "/api/chat")).json(), []);
    ws.terminate();
    await app.close();
    ({ app } = await createServer({
      localAdmin: false,
      directory: join(directory, "one"),
      editCode: "editor",
    }));
    assert.equal((await send(app, "GET", "/api/chat")).json()[0].author, "PA");
    assert.deepEqual(
      (await app.inject("/api/project")).json().document,
      document,
    );
  } finally {
    ws?.terminate();
    await app?.close();
    await other?.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
