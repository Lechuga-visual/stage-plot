import { createServer } from "./app.js";
import { networkInterfaces } from "node:os";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { resolveListenPort, serverAddress } from "./network.js";

let app, port;
try {
  const server = await createServer();
  app = server.app;
  port = resolveListenPort(server.listenPort);
  await app.listen({ port, host: process.env.HOST || "0.0.0.0" });
  const actualPort = app.server.address().port;
  const local = serverAddress("127.0.0.1", actualPort);
  console.log(
    `\nGordoStage - Servidor local\n\nEn este PC: ${local}\n${server.securityEnabled ? "Seguridad activada" : "Seguridad opcional desactivada · configúrala desde el anfitrión"}\n\nOtros dispositivos de la misma red:`,
  );
  for (const entries of Object.values(networkInterfaces()))
    for (const entry of entries || [])
      if (entry.family === "IPv4" && !entry.internal)
        console.log(`  ${serverAddress(entry.address, actualPort)}`);
  console.log(
    `\nDatos: ${resolve("data")}\nMantén esta ventana abierta. Ctrl+C para detener el servidor.\n`,
  );
  if (
    process.platform === "win32" &&
    process.env.GORDOSTAGE_NO_BROWSER !== "1"
  ) {
    const opener = spawn("cmd.exe", ["/d", "/c", "start", "", local], {
      windowsHide: true,
      stdio: "ignore",
    });
    opener.on("error", () =>
      console.log(`Abre el navegador manualmente en ${local}`),
    );
  }
  let closing = false;
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, async () => {
      if (closing) return;
      closing = true;
      await app.close();
      process.exit(0);
    });
} catch (error) {
  console.error(
    error.code === "EADDRINUSE"
      ? `El puerto ${port} ya está ocupado. Elige otro con PORT; después puedes guardarlo en Configuración y permisos.`
      : `No se pudo iniciar GordoStage: ${error.message}`,
  );
  await app?.close();
  process.exitCode = 1;
}
