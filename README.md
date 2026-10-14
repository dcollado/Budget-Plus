# Budget Plus

Shared household budget (planned vs. spent per month, fixed items that carry
over, transfers between accounts and an annual report). Next.js + Postgres
(Supabase), with payment sync to Google Calendar.

> Before touching Next.js code, read `AGENTS.md`: this version has breaking
> changes compared to earlier versions.

## Commands

```bash
npm run dev         # development server
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm test            # vitest (budget logic, report, validation, hash)
npm run build       # production build
```

## Environment variables

| Variable | Purpose |
|---|---|
| `DATA_BACKEND` | `postgres` (Supabase). If unset, uses the Google sheet (legacy mode, no roles or session revocation). |
| `DATABASE_URL` | Postgres connection (Supabase pooler). |
| `SESSION_SECRET` | Key used to sign the session cookie. |
| `APP_URL` | Public URL, for the links in emails. |
| `CRON_SECRET` | Authorizes Vercel's daily call to `/api/cron/calendario`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Invitation and recovery emails. Without SMTP in development they are printed to the console. |
| `GOOGLE_CALENDAR_ID` | Shared payments calendar (empty = no sync). |
| `GOOGLE_SHEETS_CLIENT_EMAIL`, `GOOGLE_SHEETS_PRIVATE_KEY`, `GOOGLE_SHEET_ID` | Google service account (Calendar, and the sheet in legacy mode). |
| `DEV_AUTO_LOGIN_ID`, `DEV_AUTO_LOGIN_USER` | Only with `next dev`: signs in automatically as that user. |

## Structure

- `app/` — pages and API routes (`app/api/hogar/*` is the household data).
- `proxy.ts` — verifies the session and passes the identity to routes via headers.
- `lib/household/` — budget model and logic (`presupuesto.ts`, `reporte.ts`,
  `calendario.ts`); `datos.ts` chooses between `backend-postgres.ts` and `backend-sheets.ts`.
- `lib/auth/` — role-based access, invitations, recovery, login throttling, audit.
- `supabase/migrations/` — database schema.
- `docs/SPEC.md` — product specification.
