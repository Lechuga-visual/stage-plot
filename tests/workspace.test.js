import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { createServer } from "../server/app.js";
import { normalizeProject, exportProject } from "../shared/project.js";
const doc = (name) =>
  normalizeProject({
    band: name,
    event: "",
    description: "Montaje de prueba",
    notes: "",
    width: 10,
    depth: 8,
    items: [],
    channels: [],
  });
async function fixture(fn) {
  const directory = mkdtempSync(join(tmpdir(), "gordo-workspace-"));
  let server = await createServer({ directory });
  try {
    await fn(server, directory);
  } finally {
    await server.app.close();
    rmSync(directory, { recursive: true, force: true });
  }
}
const call = (app, method, url, payload, headers = {}, remote = false) =>
  app.inject({
    method,
    url,
    payload,
    headers,
    remoteAddress: remote ? "192.0.2.10" : "127.0.0.1",
  });
test("seguridad opcional, cambio de clave local y persistencia", async () =>
  fixture(async ({ app }, directory) => {
    assert.equal(
      (await call(app, "GET", "/api/project", undefined, {}, true)).json()
        .canEdit,
      true,
    );
    assert.equal(
      (
        await call(
          app,
          "PUT",
          "/api/security",
          { enabled: true, code: "clave1", chatEnabled: true },
          {},
          true,
        )
      ).statusCode,
      403,
    );
    assert.equal(
      (
        await call(app, "PUT", "/api/security", {
          enabled: true,
          code: "clave1",
          chatEnabled: true,
        })
      ).statusCode,
      200,
    );
    assert.equal(
      (await call(app, "GET", "/api/project", undefined, {}, true)).json()
        .canEdit,
      false,
    );
    assert.equal((await call(app, "GET", "/api/project")).json().canEdit, true);
    assert.equal(
      (
        await call(
          app,
          "GET",
          "/api/project",
          undefined,
          { "x-edit-code": "clave1" },
          true,
        )
      ).json().canEdit,
      true,
    );
    await call(app, "PUT", "/api/security", {
      enabled: true,
      code: "clave2",
      chatEnabled: false,
    });
    assert.equal(
      (
        await call(
          app,
          "GET",
          "/api/project",
          undefined,
          { "x-edit-code": "clave1" },
          true,
        )
      ).json().canEdit,
      false,
    );
    assert.equal((await call(app, "GET", "/api/chat")).statusCode, 403);
    await app.close();
    const second = await createServer({ directory });
    try {
      assert.equal(
        (await second.app.inject("/api/security")).json().securityEnabled,
        true,
      );
      assert.equal(
        (
          await call(
            second.app,
            "GET",
            "/api/project",
            undefined,
            { "x-edit-code": "clave2" },
            true,
          )
        ).json().canEdit,
        true,
      );
      await call(second.app, "PUT", "/api/security", {
        enabled: false,
        chatEnabled: true,
      });
      assert.equal(
        (
          await call(second.app, "GET", "/api/project", undefined, {}, true)
        ).json().canEdit,
        true,
      );
    } finally {
      await second.app.close();
    }
  }));
test("proyectos y chat aislados; la descripción se comparte y no cambia la selección remota", async () =>
  fixture(async ({ app }) => {
    const a = (
        await call(app, "POST", "/api/projects", { document: doc("Banda A") })
      ).json(),
      b = (
        await call(app, "POST", "/api/projects", { document: doc("Banda B") })
      ).json();
    const headers = { "x-project-id": a.id };
    await call(
      app,
      "POST",
      "/api/chat",
      { author: "FOH", role: "FOH", text: "Solo A" },
      headers,
    );
    assert.equal(
      (await call(app, "GET", "/api/chat", undefined, headers)).json().length,
      1,
    );
    assert.deepEqual(
      (
        await call(app, "GET", "/api/chat", undefined, { "x-project-id": b.id })
      ).json(),
      [],
    );
    assert.equal(
      (
        await call(app, "GET", "/api/project", undefined, {
          "x-project-id": b.id,
        })
      ).json().document.band,
      "Banda B",
    );
    assert.equal(
      (await call(app, "GET", "/api/projects"))
        .json()
        .projects.find((p) => p.id === a.id).description,
      "Montaje de prueba",
    );
    assert.equal(
      (
        await call(app, "GET", "/api/project", undefined, {
          "x-project-id": "missing",
        })
      ).statusCode,
      404,
    );
    assert.equal(
      (
        await call(
          app,
          "PUT",
          "/api/project",
          { revision: 0, document: doc("Falso") },
          headers,
        )
      ).statusCode,
      409,
    );
    const unchanged = (
      await call(app, "GET", "/api/project", undefined, {
        ...headers,
        "x-known-revision": "1",
      })
    ).json();
    assert.equal(unchanged.unchanged, true);
    assert.equal(unchanged.document, null);
  }));
test("usuarios con PIN, lectura/edición y nombre automático del chat", async () =>
  fixture(async ({ app }) => {
    const profile = (
      await call(app, "POST", "/api/profiles", {
        name: "Ana",
        role: "FOH",
        permission: "viewer",
        pin: "9876",
      })
    ).json();
    assert.equal(
      (
        await call(
          app,
          "POST",
          "/api/session",
          { profileId: profile.id, pin: "0000" },
          {},
          true,
        )
      ).statusCode,
      403,
    );
    const session = (
        await call(
          app,
          "POST",
          "/api/session",
          { profileId: profile.id, pin: "9876" },
          {},
          true,
        )
      ).json(),
      headers = { "x-session-token": session.token };
    assert.equal(
      (await call(app, "GET", "/api/project", undefined, headers, true)).json()
        .canEdit,
      false,
    );
    assert.equal(
      (
        await call(
          app,
          "PUT",
          "/api/project",
          { revision: 0, document: doc("No") },
          headers,
          true,
        )
      ).statusCode,
      403,
    );
    await call(app, "POST", "/api/profiles", {
      id: profile.id,
      name: "Ana",
      role: "FOH",
      permission: "editor",
    });
    assert.equal(
      (await call(app, "GET", "/api/project", undefined, headers, true)).json()
        .canEdit,
      true,
    );
    const message = (
      await call(
        app,
        "POST",
        "/api/chat",
        { text: "Listo", author: "Suplantación" },
        headers,
        true,
      )
    ).json();
    assert.equal(message.author, "Ana");
    assert.equal(message.role, "FOH");
    await call(app, "PUT", "/api/security", {
      enabled: false,
      chatEnabled: true,
      requireRegistered: true,
    });
    assert.equal(
      (
        await call(
          app,
          "POST",
          "/api/session",
          { name: "", role: "Monitores" },
          {},
          true,
        )
      ).statusCode,
      403,
    );
    assert.equal(
      (await call(app, "GET", "/api/project", undefined, {}, true)).json()
        .canEdit,
      false,
    );
    const profiles = (await app.inject("/api/profiles")).json();
    assert.equal(profiles[0].hasPin, 1);
    assert.equal(JSON.stringify(profiles).includes("9876"), false);
  }));
test("símbolos locales se guardan en servidor, viajan en JSON y sobreviven reinicio", async () =>
  fixture(async ({ app }, directory) => {
    const bytes = readFileSync("public/symbols/techrider/cajon.webp");
    const dataUrl = "data:image/webp;base64," + bytes.toString("base64");
    const response = await call(app, "POST", "/api/assets", {
      label: "Mi cajón",
      dataUrl,
    });
    assert.equal(response.statusCode, 201);
    const asset = response.json();
    assert.equal(
      (await app.inject("/api/assets/" + asset.id)).rawPayload.equals(bytes),
      true,
    );
    const project = doc("Con imagen");
    project.customAssets.push(asset);
    project.items.push({
      id: 1,
      type: asset.id,
      label: "Cajón personalizado",
      comment: "",
      technical: { power: "none", powerNotes: "", inputs: [] },
      x: 50,
      y: 50,
    });
    assert.equal(
      (
        await call(app, "PUT", "/api/project", {
          revision: 0,
          document: project,
        })
      ).statusCode,
      200,
    );
    assert.deepEqual(
      normalizeProject(JSON.parse(exportProject(project))),
      project,
    );
    const forged = structuredClone(project);
    forged.customAssets[0].id = "custom_" + "a".repeat(64);
    forged.items[0].type = forged.customAssets[0].id;
    assert.equal(
      (await call(app, "POST", "/api/projects", { document: forged }))
        .statusCode,
      400,
    );
    assert.equal(
      (
        await call(app, "POST", "/api/assets", {
          label: "No SVG",
          dataUrl: "data:image/svg+xml;base64,PHN2Zz4=",
        })
      ).statusCode,
      400,
    );
    await app.close();
    const second = await createServer({ directory });
    try {
      assert.equal((await second.app.inject("/api/assets")).json().length, 1);
      assert.equal(
        (await second.app.inject("/api/project")).json().document.items[0].type,
        asset.id,
      );
    } finally {
      await second.app.close();
    }
  }));
test("migración conserva proyecto y chat de la versión 0.1", async () => {
  const directory = mkdtempSync(join(tmpdir(), "gordo-legacy-"));
  let app;
  try {
    const db = new DatabaseSync(join(directory, "stagecraft.sqlite"));
    db.exec(
      "CREATE TABLE project (id INTEGER PRIMARY KEY,revision INTEGER,document TEXT);CREATE TABLE chat(id INTEGER PRIMARY KEY,author TEXT,text TEXT,createdAt TEXT)",
    );
    const document = doc("Banda antigua");
    document.formatVersion = 3;
    delete document.customAssets;
    delete document.description;
    db.prepare("INSERT INTO project VALUES(1,7,?)").run(
      JSON.stringify(document),
    );
    db.prepare("INSERT INTO chat VALUES(1,?,?,?)").run(
      "Monitores",
      "Guardado antes",
      new Date().toISOString(),
    );
    db.close();
    ({ app } = await createServer({ directory }));
    const restored = (await app.inject("/api/project")).json();
    assert.equal(restored.revision, 7);
    assert.equal(restored.document.band, "Banda antigua");
    assert.equal(restored.document.formatVersion, 4);
    assert.equal(
      (await app.inject("/api/chat")).json()[0].text,
      "Guardado antes",
    );
    await app.close();
    ({ app } = await createServer({ directory }));
    assert.equal((await app.inject("/api/projects")).json().projects.length, 1);
  } finally {
    await app?.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
