# GordoStage

**Logística de escenario.**

La identidad usa la referencia visual enviada por el usuario: sala de ensayo isométrica, paredes naranjas, equipos de carbón y aros de batería azules. `public/brand/gordostage-logo.png` es una adaptación con fondo transparente de esa referencia, preparada mediante edición de imagen generativa; no es el archivo original exacto. Se utiliza en la navegación, el encabezado y el favicon.

| Color   | Valor     | Uso                           |
| ------- | --------- | ----------------------------- |
| Naranja | `#e96b22` | Identidad y navegación activa |
| Carbón  | `#292524` | Navegación y texto principal  |
| Azul    | `#56b8db` | Estado de sesión y detalles   |
| Crema   | `#fff3e8` | Fondos y superficies          |

Los nombres internos de almacenamiento `stagecraft-v1`, `stagecraft-edit-code` y `data/stagecraft.sqlite` se conservan para mantener los proyectos y sesiones existentes. El formato JSON está en versión 6, con importación de proyectos anteriores y los archivos exportados se llaman `gordostage-rider.json`.

## Biblioteca de símbolos

La familia propia reúne 180 conceptos en vista original y cenital, con variantes claras y oscuras: 720 SVG. Se usa la vista elegida por proyecto y la variante del tema de cada navegador; el PDF usa los SVG claros. Los dibujos aprobados se conservan en la biblioteca definitiva. Consulta [el uso y las convenciones](SIMBOLOS.md) y [el inventario con los archivos individuales](INVENTARIO_ICONOS.md).

## Temas y navegación

La bienvenida permite elegir **Neón**, oscuro con detalles cian/violeta y superficies de alto contraste, o **GordoStage claro**, con la paleta naranja/crema. El botón del encabezado también cambia el tema. Se guarda por navegador para que cada puesto elija según el ambiente; el PDF usa papel claro.

La barra lateral conserva el logo y aloja proyectos abiertos, con nombre y descripción al pasar el ratón o enfocar. Cerrar una pestaña afecta solo a ese navegador. La bienvenida agrupa proyectos, importación/exportación, configuración, permisos y usuarios. El chat vive en un panel flotante independiente del editor.

Los JSON v6 también guardan descripción, estilos de trazo, cableado e imágenes propias. El formato importa las versiones anteriores sin exigir convertirlas a mano.

El encabezado muestra «Logística de escenario» y agrupa las direcciones en «Acceso en red». La sesión y configuración se sitúan a la derecha del proyecto; los campos de nombre, bajada y descripción tienen lápices visibles. El footer toma la versión de la compilación y enlaza los créditos a Don Xuru y Lechuga.
