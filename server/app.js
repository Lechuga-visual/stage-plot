import Fastify from "fastify";
import staticFiles from "@fastify/static";
import { WebSocketServer } from "ws";
import { DatabaseSync } from "node:sqlite";
import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { networkInterfaces } from "node:os";
import { normalizeProject } from "../shared/project.js";
import { validateImage } from "../shared/assets.js";
import { resolveListenPort, serverAddress } from "./network.js";

export async function createServer({
  directory = resolve("data"),
  editCode = process.env.STAGE_EDIT_CODE || "",
  localAdmin = true,
} = {}) {
  mkdirSync(directory, { recursive: true });
  const db = new DatabaseSync(resolve(directory, "stagecraft.sqlite"));
  db.exec(`PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS project (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, document TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS chat (id INTEGER PRIMARY KEY AUTOINCREMENT, author TEXT NOT NULL, text TEXT NOT NULL, createdAt TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, title TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, document TEXT);
 CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, permission TEXT NOT NULL, credentials TEXT);
 CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY, label TEXT NOT NULL, dataUrl TEXT NOT NULL);`);
  const projectColumns = db
    .prepare("PRAGMA table_info(projects)")
    .all()
    .map((c) => c.name);
  if (!projectColumns.includes("description"))
    db.exec(
      "ALTER TABLE projects ADD COLUMN description TEXT NOT NULL DEFAULT ''",
    );
  const columns = db
    .prepare("PRAGMA table_info(chat)")
    .all()
    .map((c) => c.name);
  if (!columns.includes("project_id"))
    db.exec(
      "ALTER TABLE chat ADD COLUMN project_id TEXT NOT NULL DEFAULT 'default'",
    );
  if (!columns.includes("role"))
    db.exec("ALTER TABLE chat ADD COLUMN role TEXT NOT NULL DEFAULT 'Equipo'");
  const old = db.prepare("SELECT * FROM project WHERE id=1").get();
  db.prepare(
    "INSERT OR IGNORE INTO projects (id,title,revision,document) VALUES (?,?,?,?)",
  ).run(
    "default",
    old
      ? JSON.parse(old.document).band || "Proyecto inicial"
      : "Proyecto inicial",
    old?.revision || 0,
    old?.document || null,
  );
  const hashCode = (code) => {
    const salt = randomBytes(16).toString("hex");
    return { salt, hash: scryptSync(code, salt, 32).toString("hex") };
  };
  let settings;
  const stored = db.prepare("SELECT value FROM settings WHERE id=1").get();
  if (stored) settings = JSON.parse(stored.value);
  else {
    settings = {
      enabled: !!editCode,
      chatEnabled: true,
      ...(editCode ? hashCode(editCode) : {}),
    };
    db.prepare("INSERT INTO settings VALUES (1,?)").run(
      JSON.stringify(settings),
    );
  }
  const app = Fastify({ bodyLimit: 16 * 1024 * 1024, logger: false });
  const localAddresses = new Set([
    "127.0.0.1",
    "::1",
    ...Object.values(networkInterfaces())
      .flat()
      .filter(Boolean)
      .map((i) => i.address),
  ]);
  const isHost = (req) => {
    const address = req.ip?.replace(/^::ffff:/, "");
    let hostname;
    try {
      hostname = new URL("http://" + req.headers.host).hostname.replace(
        /^\[|\]$/g,
        "",
      );
    } catch {
      return false;
    }
    return (
      localAdmin &&
      localAddresses.has(address) &&
      ["localhost", ...localAddresses].includes(hostname)
    );
  };
  const hasCode = (req) => {
    if (!settings.hash) return false;
    const value = req.headers["x-edit-code"];
    if (typeof value !== "string" || value.length > 128) return false;
    const hash = scryptSync(value, settings.salt, 32);
    return timingSafeEqual(hash, Buffer.from(settings.hash, "hex"));
  };
  const sessions = new Map();
  const sessionOf = (req) => {
    const token = req.headers["x-session-token"];
    if (!token) return null;
    const session = sessions.get(token);
    if (!session) return null;
    if (session.profileId) {
      const profile = db
        .prepare("SELECT * FROM profiles WHERE id=?")
        .get(session.profileId);
      return profile
        ? {
            ...session,
            name: profile.name,
            role: profile.role,
            permission: profile.permission,
          }
        : null;
    }
    return session;
  };
  const authorized = (req) => {
    const token = req.headers["x-session-token"],
      session = sessionOf(req);
    if (token && !session) return false;
    if (session?.permission === "viewer") return false;
    if (settings.requireRegistered && !session?.profileId && !isHost(req))
      return false;
    return !settings.enabled || isHost(req) || hasCode(req);
  };
  const access = (req) => ({
    canEdit: authorized(req),
    isHost: isHost(req),
    securityEnabled: settings.enabled,
    chatEnabled: settings.chatEnabled,
    requireRegistered: !!settings.requireRegistered,
    session: sessionOf(req),
    sessionExpired: !!req.headers["x-session-token"] && !sessionOf(req),
  });
  const idOf = (req) =>
    typeof req.headers["x-project-id"] === "string"
      ? req.headers["x-project-id"]
      : "default";
  const rowOf = (req) =>
    db.prepare("SELECT * FROM projects WHERE id=?").get(idOf(req));
  const read = (row) => ({
    projectId: row.id,
    revision: row.revision,
    document: row.document ? normalizeProject(JSON.parse(row.document)) : null,
  });
  const broadcast = (message) => {
    for (const client of wss.clients)
      if (client.readyState === 1) client.send(JSON.stringify(message));
  };
  const storeAsset = (asset) => {
    const bytes = validateImage(asset.dataUrl);
    const id = "custom_" + createHash("sha256").update(bytes).digest("hex");
    if (asset.id && asset.id !== id) throw Error("ID de símbolo incorrecto");
    db.prepare("INSERT OR IGNORE INTO assets VALUES (?,?,?)").run(
      id,
      asset.label,
      asset.dataUrl,
    );
    return { id, label: asset.label, dataUrl: asset.dataUrl };
  };
  app.addHook("onRequest", async (req, reply) => {
    reply
      .header("Cache-Control", "no-store")
      .header("X-Content-Type-Options", "nosniff");
    if (req.method !== "GET" && req.headers.origin) {
      try {
        if (new URL(req.headers.origin).host === req.headers.host) return;
      } catch {}
      return reply.code(403).send({ error: "Origen no permitido" });
    }
  });
  app.get("/api/network", async (req) => {
    const binding = app.server.address();
    const port =
      typeof binding === "object" && binding
        ? binding.port
        : resolveListenPort(settings.listenPort);
    const loopback =
      typeof binding === "object" &&
      ["127.0.0.1", "::1"].includes(binding?.address);
    const hosts = loopback
      ? []
      : [
          ...new Set(
            Object.values(networkInterfaces())
              .flat()
              .filter((i) => i && i.family === "IPv4" && !i.internal)
              .map((i) => i.address),
          ),
        ];
    return {
      port,
      addresses: hosts.map((ip) => serverAddress(ip, port, req.protocol)),
      currentAddress: `${req.protocol}://${req.headers.host}`,
    };
  });
  const serverSettings = () => ({
    port: settings.listenPort ?? 3000,
    currentPort: app.server.address()?.port ?? null,
    environmentOverride: process.env.PORT !== undefined && process.env.PORT !== "",
  });
  app.get("/api/server-settings", async (req, reply) => {
    if (!isHost(req)) return reply.code(403).send({ error: "Solo el PC anfitrión configura el puerto" });
    return serverSettings();
  });
  app.put("/api/server-settings", async (req, reply) => {
    if (!isHost(req)) return reply.code(403).send({ error: "Solo el PC anfitrión configura el puerto" });
    const { port } = req.body || {};
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      return reply.code(400).send({ error: "Elige un puerto entre 1 y 65535" });
    settings.listenPort = port;
    db.prepare("UPDATE settings SET value=? WHERE id=1").run(JSON.stringify(settings));
    return serverSettings();
  });
  app.get("/api/security", async (req) => access(req));
  app.put("/api/security", async (req, reply) => {
    if (!isHost(req))
      return reply.code(403).send({
        error:
          "Configura la seguridad desde el navegador del PC anfitrión usando localhost",
      });
    const {
      enabled,
      code,
      chatEnabled,
      requireRegistered = false,
    } = req.body || {};
    if (
      typeof enabled !== "boolean" ||
      typeof chatEnabled !== "boolean" ||
      (code !== undefined && (typeof code !== "string" || code.length > 128)) ||
      (enabled && !settings.hash && (!code || code.length < 4)) ||
      (code && code.length < 4)
    )
      return reply
        .code(400)
        .send({ error: "Indica una clave de 4 a 128 caracteres" });
    settings = {
      ...settings,
      enabled,
      chatEnabled,
      requireRegistered: !!requireRegistered,
      ...(code ? hashCode(code) : {}),
    };
    db.prepare("UPDATE settings SET value=? WHERE id=1").run(
      JSON.stringify(settings),
    );
    broadcast({ type: "security" });
    return access(req);
  });
  app.get("/api/profiles", async () =>
    db
      .prepare(
        "SELECT id,name,role,permission,credentials IS NOT NULL AS hasPin FROM profiles ORDER BY name",
      )
      .all(),
  );
  app.post("/api/profiles", async (req, reply) => {
    if (!isHost(req))
      return reply
        .code(403)
        .send({ error: "Solo el anfitrión administra usuarios" });
    const { id, name, role, permission, pin } = req.body || {};
    if (
      (id !== undefined && !/^u_[a-f0-9-]{36}$/.test(id)) ||
      typeof name !== "string" ||
      !name.trim() ||
      name.length > 60 ||
      typeof role !== "string" ||
      role.length > 50 ||
      !["editor", "viewer"].includes(permission) ||
      (pin !== undefined &&
        (typeof pin !== "string" ||
          (pin !== "" && (pin.length < 4 || pin.length > 128))))
    )
      return reply.code(400).send({
        error:
          "Revisa nombre, rol, permiso y PIN opcional (4 a 128 caracteres)",
      });
    const profileId = id || "u_" + randomUUID(),
      old = db.prepare("SELECT * FROM profiles WHERE id=?").get(profileId);
    const credentials = pin
      ? JSON.stringify(hashCode(pin))
      : old?.credentials || null;
    db.prepare(
      "INSERT INTO profiles VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,role=excluded.role,permission=excluded.permission,credentials=excluded.credentials",
    ).run(profileId, name.trim(), role, permission, credentials);
    broadcast({ type: "profiles" });
    return reply.code(201).send({ id: profileId });
  });
  app.delete("/api/profiles/:id", async (req, reply) => {
    if (!isHost(req))
      return reply
        .code(403)
        .send({ error: "Solo el anfitrión administra usuarios" });
    db.prepare("DELETE FROM profiles WHERE id=?").run(req.params.id);
    broadcast({ type: "profiles" });
    return { ok: true };
  });
  app.post("/api/session", async (req, reply) => {
    const { profileId, name, role, pin } = req.body || {};
    let session;
    if (profileId) {
      const profile = db
        .prepare("SELECT * FROM profiles WHERE id=?")
        .get(profileId);
      if (!profile)
        return reply.code(404).send({ error: "Usuario no encontrado" });
      if (profile.credentials) {
        const c = JSON.parse(profile.credentials);
        if (
          typeof pin !== "string" ||
          pin.length > 128 ||
          !timingSafeEqual(
            scryptSync(pin, c.salt, 32),
            Buffer.from(c.hash, "hex"),
          )
        )
          return reply.code(403).send({ error: "PIN incorrecto" });
      }
      session = {
        profileId: profile.id,
        name: profile.name,
        role: profile.role,
        permission: profile.permission,
      };
    } else {
      if (settings.requireRegistered && !isHost(req))
        return reply
          .code(403)
          .send({ error: "Selecciona un usuario registrado" });
      if (
        typeof role !== "string" ||
        !role ||
        role.length > 50 ||
        typeof name !== "string" ||
        name.length > 60
      )
        return reply.code(400).send({ error: "Identificación inválida" });
      session = {
        profileId: null,
        role,
        name: name.trim()
          ? (name.trim() + " · " + role).slice(0, 80)
          : role + " · " + randomBytes(2).toString("hex").toUpperCase(),
        permission: "editor",
      };
    }
    const token = randomBytes(24).toString("hex");
    sessions.set(token, session);
    if (sessions.size > 1000) sessions.delete(sessions.keys().next().value);
    return { token, ...session };
  });
  app.get("/api/projects", async (req) => ({
    projects: db
      .prepare(
        "SELECT id,title,revision,description FROM projects ORDER BY rowid",
      )
      .all(),
    ...access(req),
  }));
  app.post("/api/projects", async (req, reply) => {
    if (!authorized(req))
      return reply.code(403).send({ error: "Acceso de edición requerido" });
    if (db.prepare("SELECT count(*) AS n FROM projects").get().n >= 100)
      return reply.code(400).send({ error: "Máximo 100 proyectos" });
    let document;
    try {
      document = normalizeProject(req.body?.document);
    } catch {
      return reply.code(400).send({ error: "Proyecto inválido" });
    }
    try {
      document.customAssets.forEach(storeAsset);
    } catch {
      return reply.code(400).send({ error: "Símbolo local inválido" });
    }
    const id = "p_" + randomUUID();
    db.prepare(
      "INSERT INTO projects (id,title,revision,document,description) VALUES (?,?,1,?,?)",
    ).run(
      id,
      document.band || "Sin título",
      JSON.stringify(document),
      document.description,
    );
    broadcast({ type: "projects" });
    return reply.code(201).send({ id, title: document.band, revision: 1 });
  });
  app.get("/api/project", async (req, reply) => {
    const row = rowOf(req);
    return row
      ? {
          ...(row.document &&
          req.headers["x-known-revision"] === String(row.revision)
            ? {
                revision: row.revision,
                projectId: row.id,
                document: null,
                unchanged: true,
              }
            : read(row)),
          ...access(req),
        }
      : reply.code(404).send({ error: "Proyecto no encontrado" });
  });
  app.put("/api/project", async (req, reply) => {
    if (!authorized(req))
      return reply.code(403).send({ error: "Acceso de edición requerido" });
    const row = rowOf(req);
    if (!row) return reply.code(404).send({ error: "Proyecto no encontrado" });
    let document;
    try {
      document = normalizeProject(req.body?.document);
    } catch {
      return reply.code(400).send({ error: "Proyecto inválido" });
    }
    if (!Number.isSafeInteger(req.body.revision))
      return reply.code(400).send({ error: "Revisión inválida" });
    if (row.revision !== req.body.revision)
      return reply.code(409).send(read(row));
    try {
      document.customAssets.forEach(storeAsset);
    } catch {
      return reply.code(400).send({ error: "Símbolo local inválido" });
    }
    const revision = row.revision + 1;
    db.prepare(
      "UPDATE projects SET revision=?,document=?,title=?,description=? WHERE id=?",
    ).run(
      revision,
      JSON.stringify(document),
      document.band || "Sin título",
      document.description,
      row.id,
    );
    broadcast({ type: "project", projectId: row.id, revision });
    return { revision };
  });
  app.get("/api/assets", async () =>
    db.prepare("SELECT id,label FROM assets ORDER BY rowid").all(),
  );
  app.post("/api/assets", async (req, reply) => {
    if (!authorized(req))
      return reply.code(403).send({ error: "Acceso de edición requerido" });
    const { label, dataUrl } = req.body || {};
    if (typeof label !== "string" || !label.trim() || label.length > 100)
      return reply.code(400).send({ error: "Nombre de símbolo inválido" });
    try {
      const asset = storeAsset({ label: label.trim(), dataUrl });
      broadcast({ type: "assets" });
      return reply.code(201).send(asset);
    } catch {
      return reply.code(400).send({
        error: "Usa una imagen PNG, WebP o JPEG válida de hasta 2 MB",
      });
    }
  });
  app.get("/api/assets/:id", async (req, reply) => {
    const asset = db
      .prepare("SELECT * FROM assets WHERE id=?")
      .get(req.params.id);
    if (!asset) return reply.code(404).send({ error: "Símbolo no encontrado" });
    const bytes = validateImage(asset.dataUrl);
    return reply
      .type(asset.dataUrl.slice(5, asset.dataUrl.indexOf(";")))
      .send(Buffer.from(bytes));
  });
  app.get("/api/assets/:id/document", async (req, reply) => {
    const asset = db
      .prepare("SELECT * FROM assets WHERE id=?")
      .get(req.params.id);
    return asset || reply.code(404).send({ error: "Símbolo no encontrado" });
  });
  app.get("/api/chat", async (req, reply) => {
    if (!settings.chatEnabled || !authorized(req))
      return reply
        .code(403)
        .send({ error: "Chat no disponible para esta sesión" });
    if (!rowOf(req))
      return reply.code(404).send({ error: "Proyecto no encontrado" });
    return db
      .prepare(
        "SELECT id,author,role,text,createdAt FROM (SELECT * FROM chat WHERE project_id=? ORDER BY id DESC LIMIT 200) ORDER BY id",
      )
      .all(idOf(req));
  });
  app.post("/api/chat", async (req, reply) => {
    if (!settings.chatEnabled || !authorized(req))
      return reply
        .code(403)
        .send({ error: "Chat no disponible para esta sesión" });
    if (!rowOf(req))
      return reply.code(404).send({ error: "Proyecto no encontrado" });
    const identity = sessionOf(req);
    const { text } = req.body || {};
    const author = identity?.name || req.body?.author,
      role = identity?.role || req.body?.role || "Equipo";
    if (
      typeof author !== "string" ||
      !author.trim() ||
      author.length > 80 ||
      typeof role !== "string" ||
      role.length > 50 ||
      typeof text !== "string" ||
      !text.trim() ||
      text.length > 2000
    )
      return reply.code(400).send({ error: "Nombre y mensaje requeridos" });
    const createdAt = new Date().toISOString(),
      projectId = idOf(req);
    const result = db
      .prepare(
        "INSERT INTO chat (author,role,text,createdAt,project_id) VALUES (?,?,?,?,?)",
      )
      .run(author.trim(), role, text.trim(), createdAt, projectId);
    db.prepare(
      "DELETE FROM chat WHERE project_id=? AND id NOT IN (SELECT id FROM chat WHERE project_id=? ORDER BY id DESC LIMIT 200)",
    ).run(projectId, projectId);
    broadcast({ type: "chat", projectId });
    return reply.code(201).send({
      id: Number(result.lastInsertRowid),
      author: author.trim(),
      role,
      text: text.trim(),
      createdAt,
    });
  });
  const wss = new WebSocketServer({ noServer: true });
  app.server.on("upgrade", (req, socket, head) => {
    let allowed = false;
    try {
      allowed =
        req.url === "/live" &&
        (!req.headers.origin ||
          new URL(req.headers.origin).host === req.headers.host);
    } catch {}
    if (!allowed) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) =>
      wss.emit("connection", ws, req),
    );
  });
  const dist = resolve("dist");
  if (existsSync(dist)) await app.register(staticFiles, { root: dist });
  app.addHook("onClose", async () => {
    for (const ws of wss.clients) ws.terminate();
    wss.close();
    db.close();
  });
  return { app, editCode, securityEnabled: settings.enabled, listenPort: settings.listenPort ?? 3000 };
}
export function valid(s) {
  try {
    normalizeProject(s);
    return true;
  } catch {
    return false;
  }
}
if (process.argv[1] === resolve("server/app.js")) {
  const { app, editCode, securityEnabled, listenPort } = await createServer();
  const port = resolveListenPort(listenPort);
  await app.listen({ port, host: process.env.HOST || "0.0.0.0" });
  console.log(
    `GordoStage: ${serverAddress("127.0.0.1", app.server.address().port)}\n${securityEnabled ? "Seguridad activada" + (editCode ? " · Código: " + editCode : "") : "Seguridad opcional desactivada. Configúrala desde el navegador del anfitrión."}`,
  );
  for (const entries of Object.values(networkInterfaces()))
    for (const entry of entries || [])
      if (entry.family === "IPv4" && !entry.internal)
        console.log(serverAddress(entry.address, app.server.address().port));
}
