# Distribución portable de Windows

Para Windows 10/11 x64, descarga `GordoStage-0.2.0-windows-x64.zip` de [la Release v0.2.0](https://github.com/Lechuga-visual/stage-plot/releases/tag/v0.2.0). Los ZIP automáticos de código fuente no son paquetes listos para ejecutar.

El paquete incluye interfaz compilada, 173 WebP, servidor, esquema compartido, dependencias de producción bloqueadas y runtime oficial Node.js 24.19.0 x64 con licencia. Incluye lanzador CMD y LEEME. No copia la carpeta de datos del desarrollo.

## Inicio y acceso

1. Extrae todo el ZIP en una carpeta con permiso de escritura.
2. Abre **Iniciar GordoStage.cmd** y mantén la consola abierta. Admite rutas con espacios.
3. El navegador del anfitrión abre la bienvenida. En una instalación nueva no hay clave obligatoria.
4. Usa **Configuración y permisos** para habilitar/cambiar la clave, el chat o el requisito de usuarios registrados. **Usuarios y puestos** permite crear perfiles de edición/lectura y PIN opcional.
5. Los demás dispositivos usan la dirección LAN indicada en consola. Cada uno elige sus proyectos y tema; abrir un proyecto en uno no mueve a los demás.

La administración se realiza desde el PC anfitrión, preferiblemente con `http://127.0.0.1:3000`. Los demás dispositivos solo necesitan navegador. Si Windows lo solicita, permite acceso en tu red privada. La aplicación no configura el firewall ni el Wi-Fi.

Si el puerto 3000 está ocupado, cambia `PORT`. `GORDOSTAGE_NO_BROWSER=1` evita abrir el navegador automáticamente. Ctrl+C detiene el servidor. El paquete portable no incluye instalador, actualizador automático ni un único GordoStage.exe.

## Datos y actualización

Los datos se crean en `data/stagecraft.sqlite` junto al lanzador. Para actualizar: detén el servidor, respalda `data/`, extrae la versión nueva en otra carpeta y copia allí `data/` antes de iniciar. Se migran el proyecto y chat de las versiones anteriores sin descartarlos. Conserva el respaldo anterior mientras pruebas.

Exportar JSON transfiere un proyecto con descripción, plano, fichas, input list, comentarios, rutas e imágenes personalizadas usadas. No transfiere perfiles, claves o chat; esos datos están en el respaldo completo. Los JSON v4 requieren una versión compatible del servidor de destino. Las preferencias de pestañas/tema pertenecen al navegador y las sesiones se vuelven a identificar tras reiniciar el servidor.

## Construcción y validación

Desde el repositorio, con Node.js 24, npm, Python 3 y curl:

```sh
npm ci
npm run build
npm test
npm run package:windows
npm run test:portable
```

El runtime se descarga de nodejs.org y se verifica con SHA-256 fijado en el empaquetador. El ZIP y su checksum quedan en `artifacts/`, fuera del historial de Git. `BUILD.json` identifica versión y commit fuente. Desde Linux se puede empaquetar, pero la prueba usa el Node anfitrión; la validación del `node.exe` incluido se ejecuta en Windows.

La prueba portable copia a una ruta con espacios, inicia HTTP, comprueba símbolos, modo abierto, perfil de lectura y persistencia después de reiniciar. Usa datos temporales y no abre el navegador. Las pruebas de navegador se ejecutan aparte con Chromium.

## Publicación

El workflow `.github/workflows/release-windows.yml`, activado por tags `v*`, verifica versión, instala con lockfile, compila, ejecuta los tests y empaqueta en Windows. Solo publica la prerelease tras aprobar la prueba con su runtime incluido. Después verifica el checksum y registra tag, commit, assets y ejecución en `docs/releases/latest.json`.

Para versiones siguientes, actualiza versión y notas, sube el commit y crea un tag nuevo. No reemplaces assets ni reutilices tags ya entregados. Una compilación local o un tag por sí solos no acreditan que se haya publicado el paquete; comprueba la Release y su registro.
