# Trabajo en Estudio

Antes de cargar o publicar material, leer `WORKFLOW.md` y ejecutar `node scripts/preflight.cjs` desde la raíz del repositorio. Resolver sus errores antes de continuar; distinguir los avisos de cambios locales del estado consultado en GitHub.

El usuario pidió utilizar AgentFleet para mejorar el trabajo mediante tareas repartidas y revisiones cruzadas. Usar agentes con encargos concretos y limitados: análisis del contenido, implementación o revisión independiente, según la tarea. Comprobar resultados reales antes de informar que un agente trabajó. Si una invocación falla, explicarlo y no contarla como una revisión completada. No desactivar permisos para forzar su ejecución.

Codex de AgentFleet admite revisión de archivos en sólo lectura. Antigravity también puede revisar fragmentos o planes proporcionados en el mensaje sin ejecutar herramientas cuando su modo sin interfaz no autoriza comandos. OpenCode necesita acceso a su registro local para iniciar; un error de permisos en ese registro no equivale a una revisión terminada.

Evitar búsquedas que impriman líneas completas de imágenes base64 dentro de los HTML. Leer sólo el objeto o los fragmentos necesarios.

Conservar los módulos y el progreso existentes salvo pedido expreso. Colocar el material nuevo primero dentro de su materia, usar IDs estables, mantener selección múltiple en los exámenes y actualizar las dos copias HTML y los recursos offline.

Las pruebas locales se basan en el precache mediante `tests/helpers/pwa-resources.cjs`. Verificar navegador, retorno a la materia, descargas, vista móvil y funcionamiento sin conexión cuando el cambio lo requiera. No usar cantidades o versiones fijas en comprobaciones generales que deban admitir nuevas cargas.

La identidad de Git debe configurarse sólo para este repositorio cuando falte. No cambiar configuración global ni guardar credenciales. Tras publicar por pedido del usuario, verificar el despliegue y el contenido servido antes de afirmar que está disponible.
