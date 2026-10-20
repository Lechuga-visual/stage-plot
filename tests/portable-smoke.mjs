import { spawn } from "node:child_process";
import { mkdtempSync, cpSync, rmSync, readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { once } from "node:events";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { normalizeProject } from "../shared/project.js";
const version = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
).version;
const original = resolve(
  process.argv[2] || `artifacts/staging/GordoStage-${version}-windows-x64`,
);
const directory = mkdtempSync(
  join(tmpdir(), "GordoStage portable con espacios "),
);
let child;
try {
  cpSync(original, directory, { recursive: true });
  const bytes = readFileSync(join(directory, "runtime/node.exe"));
  assert.equal(bytes.subarray(0, 2).toString(), "MZ");
  assert.ok(
    existsSync(
      join(directory, "dist/symbols/techrider/acoustic_drum_kit.webp"),
    ),
  );
  const runtime =
    process.platform === "win32"
      ? join(directory, "runtime/node.exe")
      : process.execPath;
  const start = async () => {
    let output = "";
    child = spawn(runtime, ["server/portable.js"], {
      cwd: directory,
      env: {
        ...process.env,
        PORT: "0",
        STAGE_EDIT_CODE: "",
        GORDOSTAGE_NO_BROWSER: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (data) => (output += data));
    child.stderr.on("data", (data) => (output += data));
    for (let i = 0; i < 150; i++) {
      const address = output.match(
        /En este PC: (http:\/\/127\.0\.0\.1:\d+)/,
      )?.[1];
      if (address) return address;
      if (child.exitCode !== null)
        throw Error(
          "El paquete no arrancó: " +
            output.replaceAll("portable-test", "[redactado]"),
        );
      await delay(100);
    }
    throw Error("El paquete no respondió a tiempo");
  };
  const stop = async () => {
    if (!child || child.exitCode !== null) return;
    const stopped = once(child, "exit");
    child.kill("SIGTERM");
    await stopped;
    child = null;
  };
  let base = await start();
  assert.equal((await fetch(base)).status, 200);
  const symbol = await fetch(
    base + "/symbols/techrider/acoustic_drum_kit.webp",
  );
  assert.equal(symbol.status, 200);
  assert.match(symbol.headers.get("content-type"), /image\/webp/);
  assert.equal((await fetch(base + "/api/chat")).status, 200);
  assert.equal(
    (await (await fetch(base + "/api/security")).json()).securityEnabled,
    false,
  );
  const profile = await (
    await fetch(base + "/api/profiles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Lectura portable",
        role: "Producción",
        permission: "viewer",
      }),
    })
  ).json();
  const session = await (
    await fetch(base + "/api/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profileId: profile.id }),
    })
  ).json();
  assert.ok(session.token);
  assert.equal(
    (
      await fetch(base + "/api/chat", {
        headers: { "x-session-token": session.token },
      })
    ).status,
    403,
  );
  const document = normalizeProject({
    band: "Prueba portable",
    event: "",
    notes: "",
    width: 10,
    depth: 8,
    items: [],
    channels: [],
  });
  assert.equal(
    (
      await fetch(base + "/api/project", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          "x-edit-code": "portable-test",
        },
        body: JSON.stringify({ revision: 0, document }),
      })
    ).status,
    200,
  );
  await stop();
  base = await start();
  assert.equal(
    (await (await fetch(base + "/api/project")).json()).document.band,
    "Prueba portable",
  );
  await stop();
  console.log(
    process.platform === "win32"
      ? "OK: runtime Windows incluido, HTTP, símbolos, permisos y persistencia tras reinicio."
      : "OK: contenido portable, HTTP, símbolos, permisos y persistencia; el ejecutable Windows requiere prueba nativa en CI.",
  );
} finally {
  if (child?.exitCode === null) {
    const stopped = once(child, "exit");
    child.kill("SIGTERM");
    await stopped;
  }
  rmSync(directory, { recursive: true, force: true });
}
