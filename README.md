# Budget Plus

Presupuesto compartido para un hogar (planeado vs. gastado por mes, fijos que se
heredan, transferencias entre cuentas y reporte anual). Next.js + Postgres
(Supabase), con sincronización de pagos a Google Calendar.

> Antes de tocar código de Next.js, lee `AGENTS.md`: esta versión tiene cambios
> que rompen lo que se conoce de versiones anteriores.

## Comandos

```bash
npm run dev         # servidor de desarrollo
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm test            # vitest (lógica de presupuesto, reporte, validación, hash)
npm run build       # build de producción
```

## Variables de entorno

| Variable | Para qué |
|---|---|
| `DATA_BACKEND` | `postgres` (Supabase). Sin definir usa la hoja de Google (modo heredado, sin roles ni revocación de sesión). |
| `DATABASE_URL` | Conexión a Postgres (pooler de Supabase). |
| `SESSION_SECRET` | Clave para firmar la cookie de sesión. |
| `APP_URL` | URL pública, para los enlaces de los correos. |
| `CRON_SECRET` | Autoriza la llamada diaria de Vercel a `/api/cron/calendario`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Correos de invitación y recuperación. Sin SMTP en desarrollo se imprimen en consola. |
| `GOOGLE_CALENDAR_ID` | Calendario compartido de pagos (vacío = no sincroniza). |
| `GOOGLE_SHEETS_CLIENT_EMAIL`, `GOOGLE_SHEETS_PRIVATE_KEY`, `GOOGLE_SHEET_ID` | Cuenta de servicio de Google (Calendar, y la hoja en modo heredado). |
| `DEV_AUTO_LOGIN_ID`, `DEV_AUTO_LOGIN_USER` | Solo con `next dev`: entra solo como ese usuario. |

## Estructura

- `app/` — páginas y rutas de API (`app/api/hogar/*` son los datos del hogar).
- `proxy.ts` — verifica la sesión y deja la identidad en headers para las rutas.
- `lib/household/` — modelo y lógica del presupuesto (`presupuesto.ts`, `reporte.ts`,
  `calendario.ts`); `datos.ts` elige entre `backend-postgres.ts` y `backend-sheets.ts`.
- `lib/auth/` — acceso por rol, invitaciones, recuperación, freno de login, auditoría.
- `supabase/migrations/` — esquema de la base.
- `docs/SPEC.md` — especificación del producto.
