# Capacidades compartidas y pendientes del servidor web

La edición de escenario y el formato portable pertenecen al editor común. La versión web individual estática ya los puede usar. El servidor web multiusuario todavía no está implementado ni desplegado.

| Capacidad                       | Servidor local actual                                                                  | Adaptación al servidor web                                                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Importar/exportar JSON editable | Implementado, formato v3 y migración de archivos antiguos                              | Usar `shared/project.js`; comprobar permisos de destino y no importar identidades ni credenciales          |
| Exportar rider PDF              | Impresión desde navegador con trazos y comentarios técnicos                            | Reutilizar el editor; decidir si se requiere PDF generado por servidor                                     |
| Input list configurable         | Columnas con nombre y orden, celdas editables, altas, bajas y orden de canales         | Reutilizar editor y esquema; asociar plantillas a bandas/agencias                                          |
| Comentarios de posiciones       | Asociados a instrumentos o puntos libres del plano; incluidos en JSON/PDF              | Reutilizar coordenadas y esquema; añadir autoría verificada e historial                                    |
| Dibujar sobre el plano          | Trazos de color con ratón/táctil y deshacer último trazo                               | Reutilizar editor; definir permisos y resolución de conflictos por anotación                               |
| Comentarios de montaje          | Compartidos y persistentes en el proyecto; incluidos en JSON/PDF                       | Añadir usuarios, hilos y estado resuelto según alcance de producto                                         |
| Chat entre editores             | Chat de servidor independiente del rider, autenticado con código, últimos 200 mensajes | Separar por proyecto/organización; usuarios, HTTPS, permisos, retención, límites y deduplicación de envíos |

Pendientes comunes: varios proyectos, plantillas de agencia, historial navegable y versión aprobada. Los conflictos actuales se detectan a nivel de proyecto completo; no hay combinación automática de campos ni edición sin conexión. El código de edición y los nombres escritos a mano no sustituyen cuentas de usuario.

Pendientes del producto local: instalador o ejecutable único, QR de acceso, gestión de red y prueba física de montaje con PC/tablet. Las pruebas con navegadores locales verifican comportamiento de aplicación; no verifican el firewall ni la red de otros equipos.

Ya implementado en el editor compartido: catálogo de 173 símbolos WebP, ficha técnica por equipo y relación equipo/entrada/canales. La fuente estéreo genera L y R; la alimentación del equipo se distingue de phantom 48 V por entrada. Se pueden vincular canales existentes y editar fuente, micrófono, soporte y notas desde la tabla.

Pendientes del input list: plantillas de orden y patch por productora/festival, ordenamiento automático opcional, numeración y patch físico independientes, y configuración de mezclas/envíos por canal. No hay una norma técnica universal impuesta por el producto.

Distribución de pruebas: ZIP portable Windows x64 con runtime oficial incluido y lanzador CMD. La publicación se controla por tags y pruebas nativas en GitHub Actions.
