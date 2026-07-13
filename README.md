# Login real usando las credenciales actuales de Basic Auth

Esta implementación elimina el cuadro emergente del navegador y usa las
credenciales existentes dentro del formulario visual de `/login`.

## Archivos

- `lib/auth-session.ts`
- `app/api/login/route.ts`
- `app/api/logout/route.ts`
- `app/login/page.tsx`
- `components/logout-menu.tsx`
- `middleware.ts`

## Variables de entorno

Se siguen utilizando:

```env
BASIC_AUTH_USER=
BASIC_AUTH_PASSWORD=
```

Agrega también una clave exclusiva para firmar las sesiones:

```env
SESSION_SECRET=
```

Puedes usar una cadena aleatoria larga, por ejemplo de 32 caracteres o más.
No uses la misma contraseña del login.

## Flujo

1. Cualquier página privada redirige a `/login` si no hay una sesión válida.
2. El formulario envía usuario y contraseña a `/api/login`.
3. La API compara los valores con `BASIC_AUTH_USER` y `BASIC_AUTH_PASSWORD`.
4. Si son correctos, crea una cookie `httpOnly` firmada por ocho horas.
5. `/api/logout` elimina la cookie y devuelve al usuario al login.

## Agregar el menú de logout

Importa el componente dentro del header, navegación o layout donde quieras
mostrarlo:

```tsx
import { LogoutMenu } from "@/components/logout-menu";
```

Luego colócalo dentro de la zona derecha del encabezado:

```tsx
<div className="flex items-center gap-3">
  <LogoutMenu />
</div>
```

## Importante

- No se instala ninguna dependencia.
- El popup nativo de Basic Auth deja de utilizarse.
- Las credenciales continúan viniendo de las mismas variables.
- Las APIs privadas también responden `401` sin una sesión válida.
