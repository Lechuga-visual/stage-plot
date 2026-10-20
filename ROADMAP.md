# Capacidades compartidas y servidor web pendiente

El editor común funciona en el servidor local y como sitio estático individual. El servidor web con cuentas, bandas y organizaciones todavía no está implementado ni desplegado.

| Capacidad           | Servidor local actual                                                                  | Adaptación al servidor web                                |
| ------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| JSON editable       | v4; migra versiones anteriores; imágenes propias incrustadas                           | Reutilizar esquema; validar permisos de destino           |
| PDF                 | Impresión del rider con trazos, rutas, fichas y comentarios                            | Reutilizar editor; evaluar generación en servidor         |
| Input list          | Columnas y canales configurables; fichas vinculadas mono/estéreo                       | Plantillas por banda/agencia; orden y patch opcionales    |
| Proyectos           | Varios proyectos compartidos; selección y pestañas por dispositivo                     | Organizaciones, propiedad y acceso por proyecto           |
| Dibujo y posiciones | Color, grosor, opacidad, goma parcial, borrar trazo, deshacer/rehacer y comentarios    | Conflictos por anotación e historial persistente          |
| Cableado            | Rutas visuales de energía/audio/multipar/Ethernet/vídeo, etiqueta y leyenda            | Evaluar puertos, conectividad real e inventario           |
| Biblioteca          | 173 WebP y subida PNG/WebP/JPEG; servidor e incrustación en JSON                       | Almacenamiento de objetos y cuotas por organización       |
| Chat                | Flotante, minimizable, mensajes sin leer, por proyecto, nombre/puesto automático       | HTTPS, identidades verificadas, retención y deduplicación |
| Usuarios y permisos | Perfiles locales con rol, lectura/edición y PIN; clave opcional de servidor            | Cuentas, organizaciones y permisos por proyecto           |
| Bienvenida y temas  | Proyectos, importación/exportación, configuración; oscuro Neón y claro por dispositivo | Reutilizar interfaz y añadir gestión de organización      |

Pendientes comunes: plantillas de agencia/festival, historial navegable persistente, versiones aprobadas y combinación de cambios simultáneos. Los conflictos se detectan por proyecto completo y no hay colaboración sin conexión. El orden del input list sigue siendo manual; CH se recalcula y Patch se anota aparte. Faltan configuración de mezclas/envíos, patch físico gestionado y ordenamiento automático opcional.

Pendientes locales: instalador/ejecutable único, actualizador, QR y prueba física de montaje entre PCs/tablets. El ZIP Windows x64 con runtime y lanzador ya está implementado, con publicación y pruebas nativas por tags. Las pruebas de navegador no verifican la red o el firewall de otros equipos.

Los perfiles de puesto y PIN no son cuentas web. La seguridad actual controla edición y participación; la consulta del rider sigue disponible a quienes alcanzan el servidor local. La versión pública requerirá un diseño de autenticación y acceso acorde a bandas/productoras.
