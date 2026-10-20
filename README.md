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
npm run db:migrar   # apply supabase/migrations to the DEVELOPMENT database
npm run db:seed-dev # example data (made-up household) in the development database
```

## Environment variables

| Variable | Purpose |
|---|---|
| `DATA_BACKEND` | `postgres` (Supabase). If unset, uses the Google sheet (legacy mode, no roles or session revocation). |
| `DATABASE_URL` | Postgres connection (Supabase pooler). In `.env.local` it must be the **development** project, never production. |
| `DATABASE_ENV` | Set to `development` in `.env.local` to declare that `DATABASE_URL` is a development database. `next dev` refuses to touch the database without it. |
| `SESSION_SECRET` | Key used to sign the session cookie. |
| `APP_URL` | Public URL, for the links in emails. |
| `CRON_SECRET` | Authorizes Vercel's daily call to `/api/cron/calendario`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Invitation and recovery emails. Without SMTP in development they are printed to the console. |
| `GOOGLE_CALENDAR_ID` | Shared payments calendar (empty = no sync). |
| `GOOGLE_SHEETS_CLIENT_EMAIL`, `GOOGLE_SHEETS_PRIVATE_KEY`, `GOOGLE_SHEET_ID` | Google service account (Calendar, and the sheet in legacy mode). |
| `DEV_AUTO_LOGIN_ID`, `DEV_AUTO_LOGIN_USER` | Only with `next dev`: signs in automatically as that user. |

## Development database

`next dev` must never use the production database (real data). It refuses to
run unless `DATABASE_ENV=development` is set, and the helper scripts refuse to
touch a database that already has tables but no migration history (that is a
real database).

One-time setup:

1. In Supabase create a second, free project (for example `budget-plus-dev`),
   same region as production. Save its database password in your password
   manager.
2. In that project: **Connect → Transaction pooler**, copy the connection string.
3. In `.env.local` (never in the repo): set `DATABASE_URL` to that string and add
   `DATABASE_ENV=development`. Keep the production URL only in Vercel.
4. `npm run db:migrar` creates all tables. `npm run db:seed-dev` adds a made-up
   household (David and Caro) and prints the `DEV_AUTO_LOGIN_*` values for
   `.env.local`.
5. `npm run dev`.

Production migrations are still applied by hand (Supabase SQL editor), after a
`npm run respaldo` backup.

## Structure

- `app/` — pages and API routes (`app/api/hogar/*` is the household data).
- `proxy.ts` — verifies the session and passes the identity to routes via headers.
- `lib/household/` — budget model and logic (`presupuesto.ts`, `reporte.ts`,
  `calendario.ts`); `datos.ts` chooses between `backend-postgres.ts` and `backend-sheets.ts`.
- `lib/i18n/` — languages (en, es): `messages/en.ts` is canonical; add a language by appending to `LOCALES` and creating `messages/<code>.ts`.
- `lib/auth/` — role-based access, invitations, recovery, login throttling, audit.
- `supabase/migrations/` — database schema.
- `docs/SPEC.md` — product specification.
