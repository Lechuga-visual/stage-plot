# GordoStage

**Plataforma de logística de escenario.**

La identidad usa la referencia visual enviada por el usuario: sala de ensayo isométrica, paredes naranjas, equipos de carbón y aros de batería azules. `public/brand/gordostage-logo.png` es una adaptación con fondo transparente de esa referencia, preparada mediante edición de imagen generativa; no es el archivo original exacto. Se utiliza en la navegación, el encabezado y el favicon.

| Color   | Valor     | Uso                           |
| ------- | --------- | ----------------------------- |
| Naranja | `#e96b22` | Identidad y navegación activa |
| Carbón  | `#292524` | Navegación y texto principal  |
| Azul    | `#56b8db` | Estado de sesión y detalles   |
| Crema   | `#fff3e8` | Fondos y superficies          |

Los nombres internos de almacenamiento `stagecraft-v1`, `stagecraft-edit-code` y `data/stagecraft.sqlite` se conservan para mantener los proyectos y sesiones existentes. El formato JSON está en versión 3, con importación de proyectos anteriores y los archivos exportados se llaman `gordostage-rider.json`.

## Biblioteca de símbolos

Se integraron los 173 WebP del archivo `iconos.zip` aportado por el usuario, conservando nombres y contenido original en `public/symbols/techrider/`. Fuente indicada por el usuario: https://techrider.live/tools/stage-plot-symbol-library. El proxy bloqueó la descarga directa; la integración usa el ZIP recibido, no una descarga de esa página.

El [inventario completo](SIMBOLOS.md) identifica cada símbolo, su categoría y el uso de escenario o producción. Los ocho tipos originales conservan alias para abrir proyectos existentes. No se reutilizan los emojis anteriores como símbolos del plano.
