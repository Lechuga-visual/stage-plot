# Input list y datos técnicos

## Convención de orden

GordoStage no impone una norma universal de numeración. El ejemplo inicial usa una convención habitual de sonido en vivo:

| CH  | Fuente        |
| --- | ------------- |
| 1   | Bombo         |
| 2   | Caja          |
| 3–4 | Overheads L/R |
| 5   | Bajo          |
| 6   | Guitarra      |
| 7   | Voz principal |

Una agrupación de referencia para bandas completas es batería, percusión, bajo, guitarras, teclados, pistas/DJ, vientos/cuerdas, coros, voz principal y talkback. No constituye una norma obligatoria ni una clasificación automática. Cada producción puede acordar otro patch.

Las nuevas entradas vinculadas se agregan al final de la lista. Un par estéreo se crea L antes de R. Las flechas permiten reordenar filas manualmente; CH se recalcula según su posición, no representa una toma física fija. La columna personalizada Patch permite anotar esa asignación por separado. El programa todavía no mantiene los pares juntos cuando se reordenan manualmente ni ofrece plantillas de festival.

## Configurar un equipo

1. Busca un símbolo en la biblioteca y pulsa para colocarlo. Arrastra para moverlo; pulsa el elemento colocado para abrir su ficha.
2. Indica la alimentación del equipo: ninguna, red eléctrica, pilas/batería o USB. En el detalle se pueden especificar voltaje, consumo conocido, enchufes o ubicación; son datos declarados y el programa no calcula cargas eléctricas.
3. Pulsa **Crear entrada vinculada** para una fuente nueva o selecciona un canal existente y pulsa **Vincular canal** para conservar su posición y evitar duplicados.
4. Configura nombre de fuente, micrófono o DI, señal mono/estéreo, phantom 48 V, pie y notas.
5. Añade más entradas si el equipo lo requiere. Por ejemplo, una batería puede tener entradas para bombo, caja y un par de overheads.

La alimentación del equipo y phantom son independientes: un teclado puede necesitar red eléctrica mientras su DI recibe phantom. Phantom es una necesidad declarada por entrada; la app no lo activa en una consola.

## Vínculos y edición

- Una entrada mono genera un canal. Una entrada estéreo genera dos, con sufijos L y R.
- Micrófono, soporte y notas se comparten entre los dos canales de una entrada estéreo. Para necesidades distintas, usa dos entradas mono.
- Cambiar la ficha actualiza sus canales. Editar fuente, micrófono/DI, soporte o notas desde una fila vinculada actualiza la entrada del equipo y su pareja estéreo.
- Las columnas Señal, 48 V y Alimentación son derivadas en filas vinculadas: se cambian desde la ficha. Las filas manuales siguen permitiendo edición libre.
- Las columnas técnicas se agregan al crear o vincular una entrada si hay espacio entre las 20 columnas permitidas. Si se quitan, los datos técnicos permanecen en la ficha, el JSON y el resumen técnico impreso.
- **Desvincular y conservar canales** convierte las filas en canales manuales. **Eliminar entrada y canales** los elimina tras confirmar. Eliminar un equipo también elimina sus canales vinculados tras confirmación.
- Cambiar una entrada estéreo a mono conserva el canal mono y elimina el otro. Si hay información personalizada distinta en L y R que quieras conservar, expórtala antes de convertir la entrada.

Se admiten hasta 500 elementos en el plano, 64 entradas por equipo y 500 canales en total. La colaboración mantiene la detección de conflictos a nivel de proyecto completo.

## Portabilidad e impresión

El formato JSON versión 4 guarda los IDs de símbolo, fichas técnicas, entradas y vínculos, además del plano y el resto del rider. Se importan versiones anteriores, conservando los ocho tipos originales como alias. Actualiza ambos servidores a esta versión antes de transferir un JSON v4; los servidores antiguos no conocen los nuevos símbolos ni vínculos.

Los WebP incluidos se sirven desde la instalación local, sin descargar imágenes de TechRider durante el montaje. El JSON referencia los símbolos del catálogo e incrusta las imágenes personalizadas utilizadas. La impresión a PDF incluye el plano y un resumen de alimentación y entradas de los equipos configurados. El chat sigue siendo independiente del rider.
