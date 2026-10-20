# GordoStage

**Plataforma de logística de escenario.**

Prototipo de stage plot y lista de canales para bandas. Editor con elementos móviles, notas técnicas, exportación/importación JSON e impresión a PDF. La primera prueba colaborativa reutiliza el editor JavaScript existente; la migración a React/TypeScript y el ejecutable quedan para etapas posteriores.

La identidad visual y el estado de la biblioteca de símbolos se documentan en [docs/IDENTIDAD.md](docs/IDENTIDAD.md).

## Equipos e iconografía disponibles

| Elemento        | Icono actual                 |
| --------------- | ---------------------------- |
| Voz / micrófono | 🎤                           |
| Guitarra        | 🎸                           |
| Bajo            | 🎸 invertida horizontalmente |
| Batería         | 🥁                           |
| Teclados        | 🎹                           |
| Monitor de piso | ◢                            |
| Amplificador    | ▥                            |
| Caja DI         | ▣                            |

Los iconos son emojis y símbolos provisionales, mostrados en escala de grises. Cada elemento se puede mover, renombrar y acompañar con un comentario de posición. Su apariencia puede variar según las fuentes disponibles en cada equipo.

## Capturas

Capturas de la aplicación en funcionamiento con datos de ejemplo.

### Plano de escenario y anotaciones

![Editor de escenario con instrumentos, monitores, dibujo y comentario de posición](docs/screenshots/stage-plot.png)

### Input list personalizable

![Lista de canales con columna Patch, edición de celdas y controles de orden](docs/screenshots/input-list.png)

### Coordinación durante el montaje

![Comentarios de montaje y chat privado entre editores](docs/screenshots/montaje-chat.png)

## Ejecutar en el PC anfitrión

Requiere Node.js 24 y npm. En la carpeta del repositorio:

```sh
npm ci
npm run build
npm start
```

El servidor muestra el puerto (3000 por defecto), las direcciones de red y un código de edición generado para esa sesión. Abre una de esas direcciones desde los otros dispositivos de la misma red. Permite el puerto TCP 3000 en el firewall de la red privada si fuera necesario. No abras puertos del router a internet. No hace falta instalar Codex ni Node en los dispositivos que solo consultan o editan con su navegador.

Todos entran inicialmente como lectores. Pulsa **Entrar a editar** e introduce el código mostrado por el anfitrión. Un código vacío vuelve al modo lectura. El código se conserva en la sesión del navegador. Se puede fijar con `STAGE_EDIT_CODE`; no lo incluyas en archivos compartidos. `PORT` y `HOST` permiten cambiar el puerto y la interfaz.

Los datos se guardan en `data/stagecraft.sqlite` (directorio ignorado por Git). Para respaldar todos los datos, detén el servidor antes de copiar `data/`. Para transferir un proyecto usa **Exportar proyecto** e **Importar proyecto**. La primera sesión de edición inicializa el servidor con el proyecto del navegador; después manda la versión del servidor.

Cada escritura incluye una revisión: si otro dispositivo guardó primero, se conserva la copia local y se muestra un conflicto. Exporta tu copia antes de cargar la versión del servidor. Esta prueba rechaza conflictos a nivel de proyecto; todavía no combina campos ni permite editar sin conexión. Los cambios pendientes intentan guardarse al recuperar conexión. WebSocket avisa de cambios y una consulta periódica recupera avisos perdidos.

Es una sesión local de un único proyecto, con lectura accesible a quienes alcanzan el servidor y código compartido de edición. HTTP local no cifra tráfico: úsalo en una red de confianza. Cuentas, permisos por usuario, adjuntos, QR, historial navegable, versión aprobada y empaquetado de escritorio todavía no están implementados.

## Desarrollo y verificaciones

```sh
npm test
npm run build
npm start
```

`npm run dev` inicia el editor independiente de Vite, sin servidor colaborativo. Para probar colaboración, reconstruye y usa `npm start`. `dist/` también se puede publicar como sitio estático: conserva el modo individual y guardado en el navegador. Las tipografías externas son opcionales y tienen fuentes locales de respaldo.

Las tareas cloud ya están aisladas: usa el checkout existente, sin crear worktrees. No publiques datos de prueba ni el código de edición. La prueba automatizada verifica permisos, validación de datos, notificaciones WebSocket, conflictos de revisión, persistencia tras reinicio y entrega de la página. La prueba física entre dos PCs sigue siendo necesaria para verificar Wi-Fi y firewall.

## Chat y anotaciones de montaje

- **Chat de editores:** aparece al entrar con código de edición. Escribe tu nombre y envía mensajes. SQLite conserva los últimos 200. Los lectores no pueden consultar el chat. Los nombres son declarados por cada persona, sin cuentas ni identidad verificada. El chat es independiente del proyecto: no viaja en JSON ni aparece en PDF. No envíes de nuevo un mensaje si tienes dudas de si llegó: el envío todavía no tiene identificador de deduplicación.
- **Comentarios de montaje:** escribe tu nombre y una observación técnica que deba acompañar al proyecto. Estos comentarios se comparten con los lectores, se exportan en JSON y se imprimen en el rider.
- **Dibujo:** elige Dibujar y un color, y traza con ratón o pantalla táctil. Deshacer quita el último trazo guardado del proyecto. Vuelve a Mover para arrastrar instrumentos.
- **Posiciones:** selecciona un instrumento para editar su comentario o usa Comentar posición y pulsa cualquier punto del plano. Los puntos numerados se corresponden con la lista de comentarios; se pueden editar y eliminar. Los dibujos y comentarios usan coordenadas relativas y escalan con el plano.
- **Input list:** añade, renombra, reordena y quita columnas; edita las celdas, añade/elimina canales y cambia su orden. La numeración CH se recalcula automáticamente. El formato permite hasta 20 columnas y 500 canales.

## Formato portable

Los proyectos actuales llevan `formatVersion: 2`. Conservan los datos de banda, dimensiones, instrumentos y sus comentarios, columnas ordenadas, celdas, trazos, comentarios de posiciones y de montaje. El esquema y las migraciones se comparten en `shared/project.js` entre navegador y servidor. Se admiten los JSON antiguos sin versión; los formatos futuros desconocidos se rechazan. Importar reemplaza el proyecto actual después de confirmación: expórtalo primero si necesitas conservarlo. Transferir un archivo no sincroniza los servidores automáticamente.

La transferencia entre dos instancias locales está probada. El editor estático también usa el mismo formato. La versión de servidor web con cuentas todavía no existe: su adaptación está registrada en [ROADMAP.md](ROADMAP.md).

## Prueba de navegador

Después de `npm ci` y `npm run build`:

```sh
npx playwright install chromium
npm run test:browser
```

Si Chromium ya está instalado, puedes usar `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser` en Linux. Esta prueba crea una base temporal, dos sesiones de edición y una de lectura. Verifica chat, permisos, columnas personalizadas, dibujo, comentarios, transferencia JSON por la interfaz, generación PDF y ancho móvil. No modifica los datos del servidor habitual. Ejecutar `npm test` no requiere navegador.

## Regenerar capturas

Después de compilar y preparar Chromium como en la prueba de navegador:

```sh
npm run screenshots
```

En Linux, con Chromium instalado: `CHROMIUM_PATH=/usr/bin/chromium npm run screenshots`. El script usa una base temporal con datos de ejemplo; no lee los proyectos del servidor habitual ni incluye códigos de acceso en las imágenes.
