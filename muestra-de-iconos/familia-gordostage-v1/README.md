# Familia SVG de GordoStage — muestra 01

**180 diseños, 360 SVG independientes, 14 categorías.** Cada archivo tiene fondo transparente y geometría vectorial editable. La variante `claro` se usa sobre fondos claros; `oscuro`, sobre fondos oscuros.

- [Archivos claros](claro/) · [Archivos oscuros](oscuro/)
- [Inventario con enlaces a cada SVG](INVENTARIO.md) · [Metadatos JSON](catalogo.json)
- [Láminas PNG por categoría](laminas/)
- [Vista completa clara](laminas/catalogo-claro.png) · [Vista completa oscura](laminas/catalogo-oscuro.png)
- [Descargar ZIP completo](../gordostage-180-iconos-claro-oscuro.zip)
- Catálogo local: descarga y extrae el ZIP, luego abre `index.html` en el navegador. Permite buscar, filtrar, cambiar el fondo y comprobar tamaños de 32, 48, 64 y 116 px. Funciona sin servidor ni conexión.

Los 173 conceptos de la biblioteca inicial se han redibujado con la familia propia de GordoStage. Se añaden cencerro, XLR, TRS, RJ45, PowerCON, cabeza móvil y barra LED. No se han convertido los WebP en SVG ni se han incrustado imágenes.

## Criterios visuales

Vista frontal o perspectiva sencilla según el objeto; contornos redondeados; superficies marfil y carbón, acento naranja y detalles azules. La versión oscura mantiene exactamente la misma geometría y adapta contornos y superficies al fondo nocturno. Los SVG no llevan textos externos, fuentes, scripts ni referencias remotas; las pequeñas marcas técnicas están trazadas como vectores.

Esta carpeta es una **muestra para revisión**. La biblioteca activa y los proyectos de la aplicación conservan su comportamiento actual. Se mantiene la propuesta PNG anterior como referencia del estilo.

## Reproducir

Desde la raíz del repositorio, con Python 3, Node.js y las dependencias de desarrollo instaladas:

```sh
python3 scripts/generate-icon-sample.py
node scripts/render-icon-sample.mjs
```

El segundo comando valida los SVG, genera las láminas con Chromium y crea el ZIP descargable. Usa `CHROMIUM_PATH` si Chromium no está en `/usr/bin/chromium`.
