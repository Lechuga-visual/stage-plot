import Fastify from "fastify";
import { normalizeProject } from "../shared/project.js";
import staticFiles from "@fastify/static";
import { WebSocketServer } from "ws";
import { DatabaseSync } from "node:sqlite";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { networkInterfaces } from "node:os";

export async function createServer({
  directory = resolve("data"),
  editCode = process.env.STAGE_EDIT_CODE ||
    randomBytes(9).toString("base64url"),
} = {}) {
  mkdirSync(directory, { recursive: true });
  const db = new DatabaseSync(resolve(directory, "stagecraft.sqlite"));
  db.exec(
    "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS project (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, document TEXT NOT NULL)",
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS chat (id INTEGER PRIMARY KEY AUTOINCREMENT, author TEXT NOT NULL, text TEXT NOT NULL, createdAt TEXT NOT NULL)",
  );
  const app = Fastify({ bodyLimit: 1024 * 1024, logger: false });
  const read = () => {
    const row = db
      .prepare("SELECT revision, document FROM project WHERE id=1")
      .get();
    return row
      ? {
          revision: row.revision,
          document: normalizeProject(JSON.parse(row.document)),
        }
      : { revision: 0, document: null };
  };
  const authorized = (req) => {
    const received = Buffer.from(req.headers["x-edit-code"] || "");
    const expected = Buffer.from(editCode);
    return (
      received.length === expected.length && timingSafeEqual(received, expected)
    );
  };
  app.addHook("onRequest", async (req, reply) => {
    reply.header("Cache-Control", "no-store");
    if (req.method !== "GET" && req.headers.origin) {
      const u = new URL(req.headers.origin);
      if (u.host !== req.headers.host)
        return reply.code(403).send({ error: "Origen no permitido" });
    }
  });
  app.get("/api/project", async (req) => ({
    ...read(),
    canEdit: authorized(req),
  }));
  app.put("/api/project", async (req, reply) => {
    if (!authorized(req))
      return reply.code(403).send({ error: "Código de edición requerido" });
    const { revision } = req.body || {};
    let document;
    try {
      document = normalizeProject(req.body?.document);
    } catch {
      return reply.code(400).send({ error: "Proyecto inválido" });
    }
    if (!Number.isSafeInteger(revision) || !valid(document))
      return reply.code(400).send({ error: "Proyecto inválido" });
    const current = read();
    if (current.revision !== revision) return reply.code(409).send(current);
    const next = revision + 1;
    db.prepare(
      "INSERT INTO project VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,document=excluded.document",
    ).run(next, JSON.stringify(document));
    for (const client of wss.clients)
      if (client.readyState === 1)
        client.send(JSON.stringify({ revision: next }));
    return { revision: next };
  });
  app.get("/api/chat", async (req, reply) => {
    if (!authorized(req))
      return reply.code(403).send({ error: "Solo editores" });
    return db
      .prepare(
        "SELECT * FROM (SELECT * FROM chat ORDER BY id DESC LIMIT 200) ORDER BY id",
      )
      .all();
  });
  app.post("/api/chat", async (req, reply) => {
    if (!authorized(req))
      return reply.code(403).send({ error: "Solo editores" });
    const { author, text } = req.body || {};
    if (
      typeof author !== "string" ||
      !author.trim() ||
      author.length > 80 ||
      typeof text !== "string" ||
      !text.trim() ||
      text.length > 2000
    )
      return reply
        .code(400)
        .send({
          error: "Nombre y mensaje requeridos (80 / 2000 caracteres máximo)",
        });
    const createdAt = new Date().toISOString();
    const result = db
      .prepare("INSERT INTO chat (author,text,createdAt) VALUES (?,?,?)")
      .run(author.trim(), text.trim(), createdAt);
    db.prepare(
      "DELETE FROM chat WHERE id NOT IN (SELECT id FROM chat ORDER BY id DESC LIMIT 200)",
    ).run();
    // No text is broadcast: only authenticated editors can fetch the messages.
    for (const client of wss.clients)
      if (client.readyState === 1)
        client.send(JSON.stringify({ type: "chat" }));
    return reply
      .code(201)
      .send({
        id: Number(result.lastInsertRowid),
        author: author.trim(),
        text: text.trim(),
        createdAt,
      });
  });
  const wss = new WebSocketServer({ noServer: true });
  app.server.on("upgrade", (req, socket, head) => {
    if (
      req.url !== "/live" ||
      (req.headers.origin &&
        new URL(req.headers.origin).host !== req.headers.host)
    ) {
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
  return { app, editCode };
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
  const { app, editCode } = await createServer();
  const port = Number(process.env.PORT || 3000);
  await app.listen({ port, host: process.env.HOST || "0.0.0.0" });
  console.log(
    `Stagecraft: puerto ${port}\nCódigo de edición: ${editCode}\nComparte la dirección de tu red local:`,
  );
  for (const entries of Object.values(networkInterfaces()))
    for (const entry of entries || [])
      if (entry.family === "IPv4" && !entry.internal)
        console.log(`http://${entry.address}:${port}`);
}
