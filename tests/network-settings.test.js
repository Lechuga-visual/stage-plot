import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "../server/app.js";
import { resolveListenPort, serverAddress } from "../server/network.js";

test("puerto guardado, PORT de arranque y URLs sin :80", () => {
  assert.equal(resolveListenPort(80, undefined), Number(process.env.PORT || 80));
  assert.equal(resolveListenPort(80, ""), 80);
  assert.equal(resolveListenPort(80, "9123"), 9123);
  assert.equal(resolveListenPort(80, "0"), 0);
  for (const value of ["abc", "-1", "65536", "12.5"]) assert.throws(() => resolveListenPort(80, value));
  assert.equal(serverAddress("192.0.2.10", 80), "http://192.0.2.10");
  assert.equal(serverAddress("::1", 3000), "http://[::1]:3000");
});

test("solo el anfitrión configura el puerto, se valida y persiste sin alterar seguridad", async () => {
  const directory = mkdtempSync(join(tmpdir(), "gordo-port-"));
  const first = await createServer({ directory });
  let second;
  try {
    const remote = (method, payload) => first.app.inject({method,url:"/api/server-settings",payload,remoteAddress:"192.0.2.20"});
    assert.equal((await remote("GET")).statusCode, 403);
    assert.equal((await remote("PUT", {port:80})).statusCode, 403);
    for (const port of [0, -1, 65536, 1.5, "80", null]) assert.equal((await first.app.inject({method:"PUT",url:"/api/server-settings",payload:{port}})).statusCode, 400);
    await first.app.inject({method:"PUT",url:"/api/security",payload:{enabled:true,code:"test-port",chatEnabled:true}});
    const stored = await first.app.inject({method:"PUT",url:"/api/server-settings",payload:{port:80}});
    assert.equal(stored.statusCode, 200);
    assert.equal(stored.json().port, 80);
    assert.equal((await first.app.inject("/api/security")).json().securityEnabled, true);
    await first.app.close();
    second = await createServer({ directory });
    assert.equal(second.listenPort, 80);
    assert.equal((await second.app.inject("/api/server-settings")).json().port, 80);
    assert.equal((await second.app.inject("/api/security")).json().securityEnabled, true);
  } finally {
    await first.app.close(); await second?.app.close();
    rmSync(directory, {recursive:true,force:true});
  }
});
