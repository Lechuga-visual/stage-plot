# GordoStage 0.5.0 — Logística de escenario

Versión de prueba para **Windows 10/11 x64**, con biblioteca propia y mejoras para trabajar desde varios puestos durante el montaje.

## Biblioteca propia completa

- **180 conceptos**, con vistas original y cenital, cada una clara y oscura: **720 SVG individuales**.
- Selector **Vista de iconos → Original / Cenital** por proyecto. Cada dispositivo usa los colores de su tema; el PDF utiliza la variante clara para papel.
- Retiradas las colecciones externas y las carpetas, galerías y ZIP de muestras. Los SVG definitivos siguen separados en `public/symbols/gordostage/`, con inventario enlazado en la documentación.
- Proyecto base actualizado. Se mantiene la subida compartida de iconos personalizados PNG, WebP y JPEG.

## Edición y montaje en red

- Los editores remotos pueden arrastrar uno o varios canales por HTTP desde otro PC, conservando orden relativo, vínculos y patch. Se corrige el fallo causado por una función del navegador que exigía un contexto seguro.
- Botón para insertar un canal antes de cualquier fila y añadir canales donde corresponde, además de agregarlos al final.
- Puerto configurable desde el PC anfitrión. Se guarda en el servidor y se aplica al reiniciar; `PORT` tiene prioridad. Con el puerto 80 disponible basta escribir `http://IP`.
- **Acceso en red** desplegable en el encabezado; direcciones visibles y copiables en la bienvenida.

## Interfaz y créditos

- Subtítulo **Logística de escenario**, sin la frase superior del proyecto. Sesión y configuración alineadas a la derecha.
- Nombre de banda, bajada y descripción con lápices visibles y borde al editar.
- Footer con versión de la compilación: idea original de **Don Xuru**; diseño e implementación de **Lechuga**, con enlaces a sus Instagram y a lechuga.website.
- Documentación e imágenes actualizadas de bienvenida, editor, input list, chat, biblioteca, exportación, configuración de puerto y créditos.

Se conservan el chat flotante con Enter para enviar, avisos y mute; seguridad opcional y perfiles; proyectos independientes por puesto; temas claro/Neón; dibujo, goma parcial, opacidad y cableado; fichas técnicas con canales personalizados; PDF configurable y transferencia de proyectos mediante JSON.

## Descargar y ejecutar

Descarga **GordoStage-0.5.0-windows-x64.zip**, extrae todo y abre **Iniciar GordoStage.cmd**. Incluye interfaz y runtime oficial Node.js; no requiere instalar herramientas de desarrollo. Mantén la consola abierta mientras trabajan los demás puestos. El paquete incluye un archivo SHA-256 para verificar la descarga.

El puerto inicial es 3000. La administración se realiza desde el navegador del PC anfitrión; los demás PCs y tablets acceden por una dirección LAN indicada en consola o en la interfaz. No se pide clave en una instalación nueva. Si Windows solicita acceso al firewall, permite la red privada utilizada para el montaje.

## Datos y compatibilidad

Detén el servidor y respalda `data/` antes de actualizar. Los JSON de esta versión usan **formato v6** y los identificadores de la biblioteca propia: usa 0.5.0 en ambos servidores para transferirlos. Los JSON incluyen las imágenes personalizadas utilizadas, pero no chat, perfiles ni configuración. Esos datos se conservan con el respaldo completo.

La publicación exige compilar y ejecutar las pruebas con el runtime Windows incluido, verificar permisos y persistencia tras reiniciar, y comprobar el checksum del paquete. La prueba entre puestos por HTTP, PDF e iconos también se ejecuta en navegador durante el desarrollo.

Distribución portable con CMD, todavía sin instalador ni ejecutable único. Los conflictos simultáneos se detectan por proyecto completo; el cableado es visual y el PDF se guarda desde el diálogo de impresión del navegador.
