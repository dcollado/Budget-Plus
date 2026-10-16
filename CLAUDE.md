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

## Auditoría de dependencias — obligatoria en cada push

Antes de cada push a `main` (o a la rama que se despliega):

1. Correr `npm audit --omit=dev` (lo que corre en producción).
2. Si hay vulnerabilidades de producción: arreglarlas en el mismo cambio
   (`npm audit fix`, o actualizar el paquete) y probar con `npm run typecheck`,
   `npm run lint`, `npm test` y `npm run build`. Si el arreglo es un cambio
   mayor o arriesgado, decirlo y pedir confirmación antes de aplicarlo.
3. Correr también `npm audit` completo y mencionar en el resumen del push lo que
   quede. Lo que solo viene de herramientas de desarrollo (por ejemplo `braces`
   dentro de `eslint-config-next`) no bloquea el push, pero se reporta.
4. Decir el resultado explícitamente en el resumen: "audit de producción: 0" o
   la lista de lo pendiente. No decir "listo para subir" sin haberlo corrido.
