Primera versión de prueba de GordoStage para **Windows 10/11 de 64 bits**.

Descarga **GordoStage-0.1.1-windows-x64.zip** de los assets de esta Release. Los enlaces automáticos **Source code** contienen el código fuente y requieren herramientas de desarrollo.

1. Extrae todo el ZIP en una carpeta con permiso de escritura.
2. Abre **Iniciar GordoStage.cmd**.
3. El navegador se abre en el PC anfitrión. La consola muestra el código de edición y las direcciones de la red local.
4. Mantén esa ventana abierta mientras trabajan los otros dispositivos. Detén con Ctrl+C.

No requiere instalar Node.js, npm, Python ni Codex. El ZIP incluye el runtime oficial Node.js 24.19.0, la interfaz compilada, los símbolos y las dependencias de producción. Es un paquete portable con lanzador CMD, no un instalador ni un ejecutable único GordoStage.exe.

Si Windows solicita permiso de firewall, permite el acceso en la red privada de confianza. Los otros dispositivos entran desde un navegador usando la dirección LAN del anfitrión; no necesitan instalar nada. La red y el firewall del lugar pueden requerir ajustes que esta Release no configura.

Los proyectos y el chat se guardan en la carpeta **data/** junto al lanzador. Detén el servidor antes de copiarla como respaldo. Al actualizar, conserva esa carpeta o exporta el proyecto JSON. El paquete no incluye datos personales ni credenciales de desarrollo.

Incluye 173 símbolos, datos técnicos por equipo, input list vinculado con mono/estéreo L/R, alimentación y phantom, chat de editores, comentarios de montaje/posiciones, dibujo sobre el plano, JSON v3 e impresión PDF.

Es una versión de prueba: un proyecto por servidor, código de edición compartido y conflictos a nivel de proyecto completo. No incluye cuentas, sincronización por internet, instalador ni QR.

Se publica únicamente después de compilar y ejecutar pruebas del paquete con su runtime incluido en un runner Windows. Se adjunta un archivo SHA-256 para comprobar la descarga.
