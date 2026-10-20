# GordoStage — prueba de 20 iconos cenitales

**20 conceptos, 40 SVG individuales**: una versión clara y otra oscura de cada uno. Esta prueba sirve para decidir el estilo antes de ampliar la vista cenital a los 180.

- [SVG claros](claro/) · [SVG oscuros](oscuro/) · [Metadatos](catalogo.json)
- [Descargar ZIP de la prueba cenital](../gordostage-muestra-20-cenitales.zip)
- El ZIP incluye un catálogo `index.html` para buscar y comparar ambas variantes en el navegador, sin instalar nada.

## Fondo claro

![Los 20 iconos cenitales, claros](laminas/cenital-claro.png)

## Fondo oscuro

![Los 20 iconos cenitales, oscuros](laminas/cenital-oscuro.png)

## Convenciones de la prueba

Equipos y mobiliario muestran su superficie superior: los amplificadores tienen asa, ventilación y borde frontal; los monitores muestran la rejilla y su contorno; los micrófonos incluyen la base o las patas y la proyección del brazo. La batería combina parches y platos circulares con el cuerpo del bombo visto desde arriba. La cabeza del vocalista y los hombros indican su orientación hacia la parte inferior del plano.

Las guitarras muestran el instrumento apoyado horizontalmente, visto desde arriba. Esta silueta no representa una guitarra vertical ni el espacio de un soporte. Los dibujos son esquemáticos y **no están a escala**: sirven para revisar el lenguaje visual; el espacio real se configura en el plano.

Se mantiene la paleta de GordoStage: contorno carbón/marfil, naranja y detalles azules. Cada SVG tiene fondo transparente, vista de 100 × 100, geometría editable y ninguna imagen rasterizada incrustada. Claro y oscuro comparten exactamente la misma geometría.

## Archivos por icono

| Nº | Concepto | SVG claro | SVG oscuro |
| --- | --- | --- | --- |
| 01 | Guitarra acústica | [acoustic_guitar.svg](claro/acoustic_guitar.svg) | [acoustic_guitar.svg](oscuro/acoustic_guitar.svg) |
| 02 | Guitarra eléctrica | [electric_guitar.svg](claro/electric_guitar.svg) | [electric_guitar.svg](oscuro/electric_guitar.svg) |
| 03 | Bajo eléctrico | [bass_guitar.svg](claro/bass_guitar.svg) | [bass_guitar.svg](oscuro/bass_guitar.svg) |
| 04 | Batería acústica | [acoustic_drum_kit.svg](claro/acoustic_drum_kit.svg) | [acoustic_drum_kit.svg](oscuro/acoustic_drum_kit.svg) |
| 05 | Batería electrónica | [electronic_drum_kit.svg](claro/electronic_drum_kit.svg) | [electronic_drum_kit.svg](oscuro/electronic_drum_kit.svg) |
| 06 | Congas | [conga_set.svg](claro/conga_set.svg) | [conga_set.svg](oscuro/conga_set.svg) |
| 07 | Teclado simple | [single_keyboard_rig.svg](claro/single_keyboard_rig.svg) | [single_keyboard_rig.svg](oscuro/single_keyboard_rig.svg) |
| 08 | Piano de cola | [grand_piano.svg](claro/grand_piano.svg) | [grand_piano.svg](oscuro/grand_piano.svg) |
| 09 | Micrófono vocal con cable | [vocal_mic_wired.svg](claro/vocal_mic_wired.svg) | [vocal_mic_wired.svg](oscuro/vocal_mic_wired.svg) |
| 10 | Pie de micrófono jirafa | [boom_mic_stand.svg](claro/boom_mic_stand.svg) | [boom_mic_stand.svg](oscuro/boom_mic_stand.svg) |
| 11 | Monitor de piso | [wedge_monitor.svg](claro/wedge_monitor.svg) | [wedge_monitor.svg](oscuro/wedge_monitor.svg) |
| 12 | Amplificador de guitarra | [electric_guitar_amp.svg](claro/electric_guitar_amp.svg) | [electric_guitar_amp.svg](oscuro/electric_guitar_amp.svg) |
| 13 | Amplificador de bajo | [bass_amp_rig.svg](claro/bass_amp_rig.svg) | [bass_amp_rig.svg](oscuro/bass_amp_rig.svg) |
| 14 | Caja DI activa | [active_di_box.svg](claro/active_di_box.svg) | [active_di_box.svg](oscuro/active_di_box.svg) |
| 15 | Stagebox | [stagebox.svg](claro/stagebox.svg) | [stagebox.svg](oscuro/stagebox.svg) |
| 16 | Set de DJ | [dj_setup.svg](claro/dj_setup.svg) | [dj_setup.svg](oscuro/dj_setup.svg) |
| 17 | Vocalista principal | [lead_vocalist.svg](claro/lead_vocalist.svg) | [lead_vocalist.svg](oscuro/lead_vocalist.svg) |
| 18 | Posición FOH | [foh_position.svg](claro/foh_position.svg) | [foh_position.svg](oscuro/foh_position.svg) |
| 19 | Silla | [chair.svg](claro/chair.svg) | [chair.svg](oscuro/chair.svg) |
| 20 | Cabeza móvil | [moving_head_light.svg](claro/moving_head_light.svg) | [moving_head_light.svg](oscuro/moving_head_light.svg) |

La ampliación cenital y su incorporación a la aplicación quedan pendientes de revisar esta muestra. Para regenerar ambas familias: `python3 scripts/generate-icon-sample.py` y `node scripts/render-icon-sample.mjs` desde la raíz del repositorio.
