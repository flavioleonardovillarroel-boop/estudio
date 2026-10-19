# Cargas de material en Estudio

## Preparar la copia

Desde la raíz del repositorio:

```powershell
node scripts/preflight.cjs
```

Es una comprobación de sólo lectura. Valida Git, identidad, copia alternativa del HTML, sintaxis, referencias de materias y módulos, recursos offline, manifiestos y descargas. Avisa si hay cambios locales. No descarga ni publica nada.

Para comparar HEAD con la rama remota, con acceso de red:

```powershell
node scripts/preflight.cjs --remote
```

Una referencia local `origin/main` actualizada previamente no demuestra que GitHub siga igual. La consulta remota acredita lectura; el permiso para publicar debe verificarse por separado. No modificar configuración global ni guardar credenciales en el proyecto.

## Incorporar y revisar

- Leer el archivo completo, incluidas tablas e imágenes. Conservar preguntas, respuestas y fuentes. No reemplazar material anterior salvo pedido expreso.
- Dar un ID estable al nuevo módulo y ponerlo primero dentro de su materia. Actualizar ambas copias HTML.
- Mantener el mismo número de versión en ambos service workers y agregar a PRECACHE cualquier descarga que deba funcionar sin conexión.
- Usar AgentFleet para repartir tareas y cruzar revisiones. Registrar qué agente terminó efectivamente, qué revisó y cualquier intento fallido. Una herramienta instalada no equivale a una revisión completada.
- Los servidores locales deben utilizar `tests/helpers/pwa-resources.cjs`; sus archivos permitidos se obtienen del precache. No fijar listas de recursos ni versiones de caché a mano.

Comprobaciones generales y del último material:

```powershell
node scripts/preflight.cjs
node tests/exam-selection.cjs
node tests/module-transcripts.cjs
node tests/browser.cjs
node tests/logistica-repaso-final.cjs
```

Las pruebas de navegador usan perfiles aislados y no acceden a datos reales de estudiantes. Mantener comprobaciones específicas del material cuando se carga contenido nuevo. Las pruebas históricas con cantidades o commits antiguos no sustituyen la revisión actual.

## Publicar y verificar

Revisar los archivos que se van a registrar, comprobar los finales de línea y publicar únicamente los cambios de la tarea. Antes del envío, `--strict` también exige una copia de trabajo limpia:

```powershell
node scripts/preflight.cjs --strict
```

Después del envío, confirmar que el despliegue de GitHub Pages terminó con el commit esperado y abrir el módulo y sus descargas desde el sitio publicado. Comprobar navegación de regreso, examen, vista móvil y uso sin conexión después de una primera carga online. Informar sólo lo verificado.
