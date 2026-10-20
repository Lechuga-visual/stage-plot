# Distribución portable de Windows

Para usar GordoStage, descarga el asset `GordoStage-0.1.0-windows-x64.zip` de la Release correspondiente. Los ZIP automáticos de código fuente de GitHub no son paquetes listos para ejecutar.

El paquete contiene el frontend compilado, los 173 WebP, el servidor, el esquema compartido, dependencias de producción bloqueadas por `package-lock.json`, el runtime oficial Node.js 24.19.0 para Windows x64, su licencia, un lanzador CMD y un LEEME. La carpeta `data/` se crea al ejecutar; nunca se copia de la máquina de desarrollo al paquete.

El lanzador cambia al directorio del paquete, por lo que admite rutas con espacios. Abre el navegador en el anfitrión y muestra el código de edición y direcciones LAN en la consola. Si el puerto 3000 está ocupado, se muestra un error; se puede cambiar con la variable PORT. `GORDOSTAGE_NO_BROWSER=1` desactiva la apertura automática del navegador. Mantener la consola abierta mantiene el servidor funcionando.

## Construcción

Para construir desde el repositorio se necesitan Node.js 24, npm, Python 3 y curl:

```sh
npm ci
npm run build
npm run package:windows
npm run test:portable
```

El runtime se descarga de nodejs.org y se comprueba contra el SHA-256 oficial fijado en el empaquetador. Una discrepancia detiene la construcción. El ZIP se escribe en `artifacts/` junto con su suma SHA-256; estos archivos y caches no se suben al historial de Git. Se puede construir desde Linux, pero solo Windows permite ejecutar el runtime incluido: fuera de Windows la prueba usa Node de la máquina y lo comunica expresamente.

La prueba copia la distribución a una carpeta temporal con espacios, arranca el servidor, consulta página y símbolos, verifica permisos y persiste un proyecto tras detener y volver a iniciar. No abre el navegador ni usa los datos de desarrollo.

## Publicación

El workflow `.github/workflows/release-windows.yml` se activa con tags `v*`. Comprueba que el tag coincide con `package.json`, instala con lockfile, ejecuta los tests, compila y construye el ZIP en Windows. Solo publica la prerelease si la prueba del paquete pasa con su Node.exe incluido.

Después de publicar, registra en `docs/releases/latest.json` el tag, commit, assets y enlace de la ejecución de GitHub Actions. Ese archivo acredita la publicación y sus comprobaciones; un tag o un ZIP construido localmente no equivalen por sí solos a una Release publicada.

Para publicar versiones siguientes, actualiza la versión y las notas de Release, sube el commit y crea un tag nuevo. No reutilices tags ni reemplaces assets de una versión ya entregada. Esta primera distribución no incluye un instalador, actualización automática ni un ejecutable único GordoStage.exe.
