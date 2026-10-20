# Distribución portable de Windows

Para Windows 10/11 x64, descarga `GordoStage-0.5.0-windows-x64.zip` de [la Release v0.5.0](https://github.com/Lechuga-visual/stage-plot/releases/tag/v0.5.0). Los ZIP automáticos de código fuente no son paquetes listos para ejecutar. La publicación exige completar las comprobaciones nativas de Windows; consulta el [registro del último paquete publicado](releases/latest.json).

El paquete 0.5.0 incluye la interfaz compilada, los 720 SVG propios de GordoStage, servidor, esquema compartido, dependencias de producción bloqueadas y runtime oficial Node.js 24.19.0 x64 con licencia. Incluye lanzador CMD y LEEME. No copia la carpeta de datos del desarrollo ni las muestras de iconos retiradas.

## Inicio y acceso

1. Extrae todo el ZIP en una carpeta con permiso de escritura.
2. Abre **Iniciar GordoStage.cmd** y mantén la consola abierta. Admite rutas con espacios.
3. El navegador del anfitrión abre la bienvenida. En una instalación nueva no hay clave obligatoria.
4. Usa **Configuración y permisos** para habilitar/cambiar la clave, el chat o el requisito de usuarios registrados. **Usuarios y puestos** permite crear perfiles de edición/lectura y PIN opcional.
5. Los demás dispositivos usan la dirección LAN indicada en consola. Cada uno elige sus proyectos y tema; abrir un proyecto en uno no mueve a los demás.

La administración se realiza desde el PC anfitrión, preferiblemente con `http://127.0.0.1:3000`. Los demás dispositivos solo necesitan navegador. Si Windows lo solicita, permite acceso en tu red privada. La aplicación no configura el firewall ni el Wi-Fi.

Si el puerto 3000 está ocupado, cambia `PORT`. `GORDOSTAGE_NO_BROWSER=1` evita abrir el navegador automáticamente. Ctrl+C detiene el servidor. El paquete portable no incluye instalador, actualizador automático ni un único GordoStage.exe.

## Datos y actualización

Los datos se crean en `data/stagecraft.sqlite` junto al lanzador. Para actualizar: detén el servidor, respalda `data/`, extrae la versión nueva en otra carpeta y copia allí `data/` antes de iniciar. Conserva el respaldo anterior mientras pruebas. La versión 0.5.0 utiliza exclusivamente la biblioteca propia; no contiene los catálogos externos retirados. El proyecto base ya usa los identificadores definitivos.

Exportar JSON transfiere un proyecto con descripción, plano, fichas, input list, comentarios, rutas e imágenes personalizadas usadas. No transfiere perfiles, claves o chat; esos datos están en el respaldo completo. Los JSON v6 con la biblioteca propia requieren 0.5.0 en el servidor de destino. Las preferencias de pestañas/tema pertenecen al navegador y las sesiones se vuelven a identificar tras reiniciar el servidor.

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

El encabezado y la bienvenida muestran las direcciones detectadas y el puerto real. Con varias interfaces se ofrecen otras direcciones; elige la de la red compartida con los puestos. Los controles A−/A+ y el mute del chat se guardan en cada navegador. El JSON v6 guarda la vista original o cenital de la biblioteca propia y los grupos de canales personalizados.

## Puerto desde la interfaz

Desde el PC anfitrión abre **Configuración y permisos → Conexión al servidor**, guarda un puerto entre 1 y 65535 y reinicia GordoStage. El valor se conserva en `data/stagecraft.sqlite`. El puerto predeterminado sigue siendo 3000; `PORT` tiene prioridad si lo define el entorno de arranque.

Con el puerto 80 se usa `http://IP` sin añadir el puerto. Si ya está ocupado, el lanzador indica el conflicto: arranca una vez con otro valor de `PORT` y guarda la nueva elección en configuración. Si el sistema exige permisos para el puerto elegido, usa uno permitido. Conserva las reglas del firewall acordes con el puerto utilizado.

El encabezado agrupa las direcciones y la copia en **Acceso en red**. La bienvenida las mantiene visibles. El cambio de puerto guardado no corta una sesión activa: entra en vigor tras reiniciar.
