GordoStage **0.2.0** de prueba para **Windows 10/11 x64**.

Descarga **GordoStage-0.2.0-windows-x64.zip**, extrae todo y abre **Iniciar GordoStage.cmd**. Incluye Node.js e interfaz compilada. Los enlaces Source code contienen código fuente. Mantén la consola abierta mientras trabajan los demás puestos.

## Novedades

- Bienvenida con proyectos, importación/exportación JSON, configuración, permisos y usuarios.
- Tema oscuro Neón y tema claro, elegidos por dispositivo.
- Seguridad opcional: sin clave en instalaciones nuevas; activar, desactivar y cambiar desde el anfitrión. Chat habilitable y opción de participación con usuarios registrados.
- Usuarios con puesto, edición/lectura y PIN opcional. Identificación rápida al abrir un proyecto, nombre por puesto o alias y autor automático en chat/comentarios.
- Múltiples proyectos guardados en servidor y pestañas laterales independientes por dispositivo. Hover/foco muestra nombre y descripción. Cerrar una pestaña no elimina el proyecto compartido.
- Chat flotante inferior derecho, minimizable, mensajes sin leer y conversación por proyecto.
- Herramientas con iconos: selección, dibujo, comentarios, borrar trazo o goma parcial. Color, grosor, opacidad y deshacer/rehacer.
- Rutas visuales de energía, audio, multipar, Ethernet y vídeo con etiquetas y leyenda.
- Subir símbolos PNG/WebP/JPEG desde cualquier puesto editor; biblioteca compartida almacenada en el servidor.
- JSON v4 editable con descripción, estilos de trazos, rutas e imágenes propias incrustadas. Importa versiones anteriores. PDF conserva el rider y sus anotaciones.

Se conservan los 173 símbolos, datos técnicos por equipo, mono/estéreo L/R, micrófono/DI, energía, phantom, input list personalizable y comentarios de posiciones/montaje.

## Actualizar desde 0.1.x

Detén el servidor y respalda `data/`. Extrae el nuevo ZIP y copia esa carpeta junto al lanzador antes de iniciar. El proyecto y chat anteriores se migran al proyecto inicial. El paquete no contiene datos de desarrollo. Para transferir solo un proyecto, usa JSON; chat, usuarios y configuración pertenecen al servidor.

Los otros PCs/tablets acceden por la dirección LAN mostrada en consola. No requieren instalar nada. Si Windows solicita firewall, permite acceso en la red privada. El anfitrión administra desde `http://127.0.0.1:3000`.

## Alcance de esta prueba

ZIP portable con CMD, todavía sin instalador ni ejecutable único. Detecta conflictos por proyecto completo; no combina cambios simultáneos ni ofrece colaboración sin conexión. Las rutas de cable son gráficas, sin conexiones automáticas a puertos ni cálculo eléctrico. El historial de dibujo es local en memoria y se reinicia al recibir dibujos remotos. Los perfiles son locales, sin cuentas o sincronización de un servicio en internet.

La publicación requiere compilación, tests y prueba nativa del paquete con el runtime incluido en Windows. Se adjunta SHA-256 para verificar la descarga. La prueba física de red entre tus PCs queda por realizar.
