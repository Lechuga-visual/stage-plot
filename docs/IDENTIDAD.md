# GordoStage

**Plataforma de logística de escenario.**

La identidad usa la referencia visual enviada por el usuario: sala de ensayo isométrica, paredes naranjas, equipos de carbón y aros de batería azules. `public/brand/gordostage-logo.png` es una adaptación con fondo transparente de esa referencia, preparada mediante edición de imagen generativa; no es el archivo original exacto. Se utiliza en la navegación, el encabezado y el favicon.

| Color   | Valor     | Uso                           |
| ------- | --------- | ----------------------------- |
| Naranja | `#e96b22` | Identidad y navegación activa |
| Carbón  | `#292524` | Navegación y texto principal  |
| Azul    | `#56b8db` | Estado de sesión y detalles   |
| Crema   | `#fff3e8` | Fondos y superficies          |

Los nombres internos de almacenamiento `stagecraft-v1`, `stagecraft-edit-code` y `data/stagecraft.sqlite` se conservan para mantener los proyectos y sesiones existentes. El formato JSON está en versión 5, con importación de proyectos anteriores y los archivos exportados se llaman `gordostage-rider.json`.

## Biblioteca de símbolos

Se integraron los 173 WebP del archivo `iconos.zip` aportado por el usuario, conservando nombres y contenido original en `public/symbols/techrider/`. Fuente indicada por el usuario: https://techrider.live/tools/stage-plot-symbol-library. El proxy bloqueó la descarga directa; la integración usa el ZIP recibido, no una descarga de esa página.

El [inventario completo](SIMBOLOS.md) identifica cada símbolo, su categoría y el uso de escenario o producción. Los ocho tipos originales conservan alias para abrir proyectos existentes. No se reutilizan los emojis anteriores como símbolos del plano.

## Temas y navegación

La bienvenida permite elegir **Neón**, oscuro con detalles cian/violeta y superficies de alto contraste, o **GordoStage claro**, con la paleta naranja/crema. El botón del encabezado también cambia el tema. Se guarda por navegador para que cada puesto elija según el ambiente; el PDF usa papel claro.

La barra lateral conserva el logo y aloja proyectos abiertos, con nombre y descripción al pasar el ratón o enfocar. Cerrar una pestaña afecta solo a ese navegador. La bienvenida agrupa proyectos, importación/exportación, configuración, permisos y usuarios. El chat vive en un panel flotante independiente del editor.

Los JSON v5 también guardan descripción, estilos de trazo, cableado e imágenes propias. El formato importa las versiones anteriores sin exigir convertirlas a mano.

La versión 0.3.0 añade selector Genéricos/X32-M32, con 74 SVG originales y su licencia, y guarda el estilo por proyecto. El texto crece un 20% por defecto y A−/A+ permite ajustarlo por puesto. La impresión restablece el tamaño base para que el tema y preferencias de cada navegador no alteren el tamaño del PDF. La exportación permite elegir secciones, equipos, canales e información gráfica sin editar el rider.
