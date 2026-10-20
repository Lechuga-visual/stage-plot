# Muestras de iconos de GordoStage

Familia propia en SVG, con contornos redondeados, superficies marfil/carbón, naranja y detalles azules. Cada icono está en un **archivo separado**, con fondo transparente y geometría editable. Los PNG sirven para revisar las colecciones en GitHub.

| Muestra | Diseños | SVG individuales | Claro | Oscuro | Descarga |
| --- | --- | --- | --- | --- | --- |
| [Familia completa — vista original](familia-gordostage-v1/) | 180 | 360 | [Carpeta](familia-gordostage-v1/claro/) | [Carpeta](familia-gordostage-v1/oscuro/) | [ZIP](gordostage-180-iconos-claro-oscuro.zip) |
| [Familia completa — vista cenital](familia-gordostage-cenital-v1/) | 180 | 360 | [Carpeta](familia-gordostage-cenital-v1/claro/) | [Carpeta](familia-gordostage-cenital-v1/oscuro/) | [ZIP](gordostage-180-cenitales-claro-oscuro.zip) |
| [Referencia cenital de 20 aprobada](cenital-20/) | 20 | 40 | [Carpeta](cenital-20/claro/) | [Carpeta](cenital-20/oscuro/) | [ZIP](gordostage-muestra-20-cenitales.zip) |

**Las dos colecciones completas suman 720 SVG:** 180 conceptos × 2 vistas × 2 temas. Además se conserva la referencia de 20 con sus 40 SVG, incluidos sin cambios en la colección cenital. El estilo cenital fue aprobado; estos recursos todavía no forman parte del selector de iconos de la aplicación.

## Familia completa: 180 diseños

El inventario inicial contiene **173 conceptos**. Se han redibujado y se añaden siete: **cencerro** (n.º 174), conector XLR, jack TRS, RJ45/Ethernet, PowerCON, cabeza móvil y barra LED. Se conservan los identificadores originales para facilitar una futura integración.

- [Inventario con enlaces a cada uno de los 360 SVG](familia-gordostage-v1/INVENTARIO.md).
- [Láminas por las 14 categorías, claras y oscuras](familia-gordostage-v1/laminas/).
- [Lámina completa sobre fondo claro](familia-gordostage-v1/laminas/catalogo-claro.png) · [Lámina completa sobre fondo oscuro](familia-gordostage-v1/laminas/catalogo-oscuro.png).

![Ejemplo: instrumentos de cuerda de la familia propia](familia-gordostage-v1/laminas/claro-cuerdas.png)

## Vista cenital completa: 180 diseños

La familia cenital completa conserva los 20 dibujos aprobados y extiende el mismo estilo a todos los instrumentos, equipos de audio, monitores, mobiliario, artistas, puestos de producción, conectores y anotaciones. Usa los mismos identificadores y números que la vista original.

- [Inventario de los 180 cenitales, con enlaces a cada SVG](familia-gordostage-cenital-v1/INVENTARIO.md).
- [Las 14 categorías en claro y oscuro](familia-gordostage-cenital-v1/laminas/).
- [Lámina cenital completa clara](familia-gordostage-cenital-v1/laminas/catalogo-claro.png) · [Lámina cenital completa oscura](familia-gordostage-cenital-v1/laminas/catalogo-oscuro.png).
- [Convenciones de la vista superior](familia-gordostage-cenital-v1/README.md#vista-superior).

![Batería y percusión cenitales, variante clara](familia-gordostage-cenital-v1/laminas/claro-bateria-y-percusion.png)

![Monitores y PA cenitales, variante oscura](familia-gordostage-cenital-v1/laminas/oscuro-monitores-y-pa.png)

La [referencia inicial de 20](cenital-20/) se conserva para comparar. Sus archivos SVG son idénticos a los de esos mismos conceptos en la colección completa; la numeración de la colección sigue el inventario de 180.

## Revisar y descargar

En GitHub puedes abrir las láminas o cualquier SVG individual. Para descargar un pack, abre su ZIP y pulsa **Download raw file**; también puedes usar los enlaces directos:

- [Descargar los 180 en claro y oscuro](https://github.com/Lechuga-visual/stage-plot/raw/refs/heads/main/muestra-de-iconos/gordostage-180-iconos-claro-oscuro.zip).
- [Descargar los 180 cenitales en claro y oscuro](https://github.com/Lechuga-visual/stage-plot/raw/refs/heads/main/muestra-de-iconos/gordostage-180-cenitales-claro-oscuro.zip).
- [Descargar la referencia de 20 cenitales](https://github.com/Lechuga-visual/stage-plot/raw/refs/heads/main/muestra-de-iconos/gordostage-muestra-20-cenitales.zip).

Extrae el ZIP y abre `index.html` para buscar por nombre, filtrar por categoría, cambiar de fondo y comprobar tamaños de 32, 48, 64 y 116 px. El catálogo usa archivos locales y no necesita un servidor. Cada pack incluye `catalogo.json` con identificadores, nombres, categorías, variantes y rutas.

Los SVG comparten una vista de 100 × 100 y mantienen la misma geometría entre claro y oscuro. Son dibujos vectoriales propios; no son contenedores de WebP o PNG. Las medidas del dibujo son esquemáticas, sin escala física.

## Regenerar las muestras

Desde la raíz del repositorio, con Python 3, Node.js y las dependencias de desarrollo instaladas:

```sh
python3 scripts/generate-icon-sample.py
node scripts/render-icon-sample.mjs
```

El primer comando genera los SVG y los catálogos. El segundo comprueba inventarios, geometría, variantes, límites del dibujo y lectura de imágenes; verifica los controles del catálogo y genera las láminas y los ZIP. Usa Chromium en `/usr/bin/chromium` o la ruta de `CHROMIUM_PATH`. En el navegador administrado del entorno, la navegación directa a `file://` está bloqueada; las comprobaciones funcionales del catálogo se ejecutan sobre HTTP local.

Puedes procesar una sola colección con `node scripts/render-icon-sample.mjs --pack=cenital` (180 cenitales), `--pack=original` (180 de la vista original) o `--pack=referencia` (los 20 aprobados).

## Referencia visual anterior

La propuesta PNG de diez iconos se conserva como referencia de estilo. Los SVG simplifican su detalle para funcionar a tamaños pequeños.

<details>
<summary>Ver propuesta 01</summary>

![Propuesta inicial de diez iconos GordoStage](gordostage-propuesta-01.png)

</details>
