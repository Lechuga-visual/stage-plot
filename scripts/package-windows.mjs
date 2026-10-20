import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

// Runtime checksum obtained from the official Node.js SHASUMS256.txt over HTTPS.
const runtimeVersion = "24.19.0";
const runtimeHash =
  "57f71ab3652e797d84acddc79c81cc9ff1c6ddb2a1974cdb83f00fee9bff4c73";
const root = resolve("."),
  version = JSON.parse(readFileSync("package.json")).version;
const name = `GordoStage-${version}-windows-x64`;
const output = resolve("artifacts"),
  stage = join(output, "staging", name),
  cache = join(output, "cache");
const archive = join(cache, `node-v${runtimeVersion}-win-x64.zip`);
const zip = join(output, `${name}.zip`);
const command = (file, args, options = {}) => {
  const r = spawnSync(file, args, { stdio: "inherit", ...options });
  if (r.error) throw r.error;
  if (r.status !== 0) throw Error(`${file} terminó con código ${r.status}`);
};
if (!existsSync("dist/index.html"))
  throw Error("Ejecuta npm run build antes de empaquetar");
mkdirSync(cache, { recursive: true });
if (!existsSync(archive))
  command("curl", [
    "--fail",
    "--location",
    "--silent",
    "--show-error",
    "--max-time",
    "180",
    "--output",
    archive,
    `https://nodejs.org/dist/v${runtimeVersion}/node-v${runtimeVersion}-win-x64.zip`,
  ]);
const actual = createHash("sha256").update(readFileSync(archive)).digest("hex");
if (actual !== runtimeHash)
  throw Error(
    "El runtime descargado no coincide con el SHA-256 oficial. No se usará.",
  );
rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });
for (const path of [
  "dist",
  "server",
  "shared",
  "package.json",
  "package-lock.json",
])
  cpSync(join(root, path), join(stage, path), { recursive: true });
// Install only locked production packages into the isolated distribution directory.
if (process.platform === "win32")
  command(
    "cmd.exe",
    ["/d", "/c", "npm", "ci", "--omit=dev", "--no-audit", "--no-fund"],
    { cwd: stage },
  );
else
  command(
    "npm",
    [
      "ci",
      "--omit=dev",
      "--no-audit",
      "--no-fund",
      "--cache",
      join(cache, "npm"),
    ],
    { cwd: stage },
  );
command("python", [
  "-c",
  `import zipfile,pathlib,sys
archive,stage,version=sys.argv[1:]
with zipfile.ZipFile(archive) as z:
 p=pathlib.Path(stage)/'runtime';p.mkdir(exist_ok=True)
 for filename in ['node.exe','LICENSE']:
  (p/filename).write_bytes(z.read('node-v'+version+'-win-x64/'+filename))
`,
  archive,
  stage,
  runtimeVersion,
]);
const launcher = `@echo off\r\nchcp 65001 >nul\r\nsetlocal\r\ncd /d "%~dp0"\r\ntitle GordoStage - Servidor local\r\n"%~dp0runtime\\node.exe" "%~dp0server\\portable.js"\r\nif errorlevel 1 (\r\n  echo.\r\n  echo No se pudo iniciar GordoStage. Revisa el mensaje anterior.\r\n  pause\r\n)\r\n`;
writeFileSync(join(stage, "Iniciar GordoStage.cmd"), launcher);
writeFileSync(
  join(stage, "LEEME.txt"),
  `GordoStage ${version} - Windows 10/11 x64\r\n\r\n1. Extrae TODO el ZIP en una carpeta donde puedas guardar datos.\r\n2. Abre Iniciar GordoStage.cmd. No lo ejecutes dentro del ZIP.\r\n3. Se abrirá la bienvenida; la consola muestra las direcciones de red.\r\n4. Mantén la consola abierta. Detén con Ctrl+C.\r\n5. Los demás PCs/tablets usan la dirección de red del anfitrión. No necesitan instalar nada.\r\n\r\nEn una instalación nueva no se pide clave. Desde Configuración y permisos del PC anfitrión puedes activar seguridad, fijar o cambiar la clave, y habilitar o deshabilitar el chat.\r\nDesde Usuarios y puestos puedes registrar participantes con permiso de edición o lectura y PIN opcional.\r\nCada dispositivo elige sus proyectos y tema de forma independiente. Los proyectos y los símbolos subidos se guardan en el servidor.\r\n\r\nNo hace falta instalar Node.js, npm, Python ni Codex para usar este paquete.\r\nSi Windows pregunta por el firewall, permite acceso en tu red privada de confianza.\r\nLos datos se guardan en data/ junto al lanzador. Haz una copia con el servidor detenido.\r\nAl actualizar, detén el servidor y conserva esa carpeta data/ o exporta cada proyecto JSON.\r\nEl paquete no contiene tus proyectos, chats ni códigos de acceso.\r\n\r\nDistribución portable: lanzador CMD + runtime oficial Node.js ${runtimeVersion} incluido.\r\nTodavía no es un instalador ni un ejecutable único GordoStage.exe.\r\n`,
);
const build = {
  version,
  platform: "windows-x64",
  runtime: `Node.js ${runtimeVersion}`,
  runtimeArchiveSha256: runtimeHash,
  sourceCommit:
    process.env.GITHUB_SHA ||
    spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim(),
};
writeFileSync(join(stage, "BUILD.json"), JSON.stringify(build, null, 2) + "\n");
command("python", [
  "-c",
  `import pathlib,zipfile,sys
stage,output=sys.argv[1:];stage=pathlib.Path(stage)
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for file in sorted(stage.rglob('*')):
  if file.is_file():z.write(file,pathlib.Path(stage.name)/file.relative_to(stage))
`,
  stage,
  zip,
]);
const digest = createHash("sha256").update(readFileSync(zip)).digest("hex");
writeFileSync(join(output, `${name}.sha256`), `${digest}  ${name}.zip\n`);
console.log(`Paquete creado: ${zip}\nSHA-256: ${digest}`);
