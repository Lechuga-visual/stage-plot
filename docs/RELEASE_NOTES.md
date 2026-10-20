GordoStage **0.3.0** de prueba para **Windows 10/11 x64**.

Descarga **GordoStage-0.3.0-windows-x64.zip**, extrae todo y abre **Iniciar GordoStage.cmd**. Incluye Node.js e interfaz compilada. Mantén la consola abierta mientras trabajan los demás puestos.

## Novedades

- Chat con **Enter para enviar** y **Shift+Enter para nueva línea**. Aviso destacado de mensajes sin leer, sonido breve y botón para silenciarlo por navegador. El sonido requiere una interacción inicial con la página.
- Papelera para borrar equipos con confirmación, avisando si se eliminan canales vinculados. Herramientas agrupadas en Items y Trazos. Las etiquetas se superponen sobre los iconos de los equipos.
- Input list con arrastre desde ambos extremos de cada fila, selección de varios canales, Shift+clic para rangos y destino por teclado. Conserva orden relativo, vínculos y patch.
- Texto un 20% mayor por defecto y controles superiores A−/A+ entre 100% y 180%, independientes por dispositivo.
- Dirección IP/puerto y botón Copiar en encabezado y bienvenida. Varias interfaces disponibles en Otras direcciones.
- Configuración y usuarios aparecen en gris y deshabilitados en puestos remotos.
- Entradas con cantidad personalizada de 1 a 64 canales y etiquetas individuales, además de mono/estéreo. Confirmación al reducir canales. Micrófono/DI, phantom, soporte y notas son comunes al grupo.
- PDF configurable: secciones, equipos y canales individuales; iconos, etiquetas, dibujo, cableado, marcadores y cuadrícula. Botón **Exportar con todo**. Las opciones no alteran el rider abierto.
- **74 SVG X32/M32** de mamarguerat/behringer-icons, además de los 173 símbolos genéricos. Selector de estilo por proyecto, equivalencias visuales y búsqueda. Incluye licencia y procedencia de la colección.
- JSON **v5** con grupos de canales y estilo de iconos; importa los formatos anteriores, incluido v4.

Se conservan proyectos compartidos con pestañas por dispositivo, seguridad opcional, usuarios/PIN, chat flotante por proyecto, temas, goma parcial/opacidad, rutas visuales de cableado, símbolos propios y comentarios.

## Actualizar desde 0.1.x o 0.2.0

Detén el servidor y respalda `data/`. Extrae el ZIP nuevo y copia esa carpeta junto al lanzador antes de iniciar. Los proyectos y chats existentes se conservan. Actualiza los servidores de destino antes de transferir JSON v5. El JSON no incluye chat, usuarios ni configuración; esos datos pertenecen al respaldo completo.

El anfitrión administra desde `http://127.0.0.1:3000`. Los demás PCs/tablets entran por la dirección LAN, sin instalar herramientas. Si Windows solicita firewall, permite acceso en la red privada.

Distribución portable con CMD, todavía sin instalador ni ejecutable único. Los conflictos siguen siendo por proyecto completo; no se combinan cambios simultáneos. El cableado es visual. El historial de dibujo está en memoria. El PDF se guarda desde el diálogo de impresión del navegador. Se adjunta SHA-256 y la publicación exige pruebas nativas del runtime incluido en Windows.
