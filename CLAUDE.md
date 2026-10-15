@AGENTS.md

# Reglas del proyecto

## Página de cambios (/cambios) — obligatoria en cada push

Con **cada push a `main`** (o a la rama que se despliega) hay que actualizar
`lib/changelog.ts` en el mismo cambio:

1. Agregar o ampliar la entrada de arriba con lo que cambió, en **inglés y español**.
2. Escribir para el usuario final, en pocas líneas, sin nombres internos.
3. **No incluir cambios de administración** (panel Admin, super-admin, registro de
   actividad, solicitudes de acceso desde el lado del admin, etc.). `/cambios` es
   pública. Lo valida `lib/changelog.test.ts`.
4. Si el push no cambia nada visible para el usuario (refactor, tests, CI), no hace
   falta entrada, pero hay que decirlo explícitamente en el resumen del push.
5. El enlace a la página vive en el menú de usuario ("Novedades" / "What's new") y en
   las páginas públicas (inicio, login, solicitar acceso). No lo quites.

Antes de decir que algo "está listo para subir", comprobar que el changelog está al día.
