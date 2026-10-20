# Biblioteca propia de GordoStage

La aplicación incluye **180 conceptos propios y 720 SVG**: vista original y vista cenital, cada una clara y oscura. Los SVG son independientes, transparentes y editables. Se retiraron las colecciones TechRider, TecRider y X32/M32 del catálogo y de los archivos incluidos.

## Elegir vista y tema

En **Vista de iconos**, elige **Original** o **Cenital**. La vista se guarda en el proyecto y se comparte con los demás editores. El tema del navegador elige automáticamente la variante clara u oscura; cada puesto puede usar un tema distinto. El PDF usa la variante clara de la vista elegida para conservar contraste sobre papel.

Los conceptos y sus datos técnicos permanecen al cambiar de vista. Los instrumentos portátiles cenitales se representan apoyados horizontalmente, según la referencia aprobada. Son dibujos esquemáticos, sin escala física.

- [Vista original: archivos claros y oscuros](../public/symbols/gordostage/original/).
- [Vista cenital: archivos claros y oscuros](../public/symbols/gordostage/cenital/).
- [Inventario de los 180 con sus cuatro archivos individuales](INVENTARIO_ICONOS.md).
- [SVG de la aplicación](../public/symbols/gordostage/).

## Categorías

| Categoría | Conceptos |
| --- | --- |
| Cuerdas | 14 |
| Teclados y electrónica | 11 |
| Batería y percusión | 26 |
| Vientos y tradicionales | 18 |
| Micrófonos | 15 |
| Soportes y mobiliario | 11 |
| Amplificadores y audio | 21 |
| Monitores y PA | 17 |
| DJ y reproducción | 7 |
| Artistas y equipo humano | 18 |
| Producción, RF y vídeo | 13 |
| Anotaciones y zonas | 3 |
| Conectores y cableado | 4 |
| Iluminación | 2 |

## Iconos personalizados

Un editor puede subir PNG, WebP o JPEG desde cualquier dispositivo. El servidor guarda la imagen y la comparte con los demás puestos. Los iconos personalizados usados se incrustan en el JSON para transferirlos a otro servidor: hasta 100 imágenes y 10 MiB en conjunto por proyecto. La carpeta `data/` también conserva las imágenes subidas que todavía no se usan en un proyecto.

Los SVG propios incluidos se referencian por identificador; sus 720 archivos viajan con la aplicación. El formato JSON actual es **v6**, con `symbolStyle: "original"` o `"cenital"`. El catálogo está en `shared/gordostage-catalog.js`. Las muestras de revisión se retiraron; los archivos definitivos viven en `public/symbols/gordostage/`.

Para modificar la biblioteca, edita la geometría en `scripts/generate-symbols.py` y los nombres/categorías en `scripts/symbol-inventory.json`. Ejecuta `npm run icons:generate` con Python 3 para regenerar los SVG, el catálogo y este inventario. La compilación normal usa los archivos ya incluidos y no necesita generar muestras.
