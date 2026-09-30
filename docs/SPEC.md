# Budget app revamp: spec (draft)

Status: draft for review. Items marked **[DEFAULT]** are assumptions to confirm.

## Goals
- One shared household budget for two members (David and his wife).
- Plan (monthly category budgets) and track (actual vs planned) in the same view.
- Debts and cards are tracked only. No payoff planner.
- USD only.
- Input: manual and bank import. Chat capture (WhatsApp/Telegram) is deferred to a later phase.

## Non-goals
- Multi-household or public product.
- Multi-currency.
- Debt-payoff optimisation, investment tracking.

## Data model
Money is stored as integer cents (USD).

- **household**: id, name.
- **member**: id, household_id, user_id, display_name, role.
- **account**: id, household_id, name, type (cash | bank | card | loan), owner (member id or null = joint), opening_balance. Cards and loans are accounts with negative balances.
- **category**: id, household_id, name, kind (expense | income), archived.
- **transaction**: id, household_id, account_id, date, amount, category_id, payee, note, member_id (who entered), owner (member id or null = joint), type (expense | income | transfer), transfer_account_id (for transfers), source (manual | import | chat | qr), external_id (for dedupe), created_at.
- **budget**: household_id, category_id, month (YYYY-MM), planned_amount.
- **recurring_rule**: id, household_id, template fields, cadence, next_due. Rules project expected bills. They never copy rows into the ledger ahead of time. A due item becomes a real transaction when confirmed or auto-posted.
- **import_batch / import_row**: raw rows land in an inbox for review. Dedupe key: account + date + amount + normalised payee + bank reference.
- **payee_rule**: payee pattern -> category, learned from confirmed rows.

Rules:
- Transfers (including card and loan payments) never count as spending.
- Actual spending is always computed from transactions, never stored.

## Screens
1. **Home**: left to spend this month (overall and by category), planned vs actual, upcoming bills.
2. **Transactions**: filter by All / Mine / Hers / Joint, quick-add.
3. **Budget**: edit monthly caps per category. **[DEFAULT]** category caps, not envelopes.
4. **Accounts**: balances, including cards and loans.
5. **Import inbox**: review, categorise, confirm imported and chat-captured rows.
6. **Recurring**: manage rules and upcoming bills.
7. **Reports**: monthly review, trends.

## Visibility
**[DEFAULT]** Both members see full detail of all household transactions. Personal ownership is a filter, not a privacy wall.

## Input channels
1. Manual quick-add (built first).
2. Bank import via CSV/OFX upload with per-bank column mapping. Needs sample statements from each bank.
3. Chat capture: **deferred** (not in scope for the first version). Idea kept for later: text or receipt photo to a bot, LLM extraction, allow-listed numbers only.
4. DGI QR scan is kept as an additional manual entry method (existing parser).

## Presupuesto redesign + payment dates (2026-09-30)
Feedback from David and Caro. `/presupuesto` now:
- Shows **two months at once**: the chosen month and the next one
  (`MesPanel` x2; side by side on desktop, stacked on mobile).
- Per month: 4 widgets — Ingresos (fixed + variable income), Gastos fijos,
  Gastos variables, Por gastar (= ingresos − fijos − variables). The old
  Planeado/Gastado tiles and the in-list totals footer are gone.
- **Variables del mes** first: one list of variable expenses *and*
  variable incomes, sorted by payment date, with "+ Gasto variable" /
  "+ Ingreso variable" buttons. Only items with an amount that month are
  listed — Restaurantes/Entretenimiento/Misceláneos (at $0) no longer
  show; they were not archived.
- **Gastos fijos** second, compact one-line rows (date · name · amount),
  read-only, sorted by payment date. No separate Ingresos fijos section
  (covered by the Ingresos widget).

**Payment dates** (Caro wants to sort by when things get paid):
- Fixed categories: `Category.dueDay` (1–31), new column **G** of
  `Categories`. Set once in Configuración ("Día" field) and applied to
  every month (clamped to the month's last day). `PATCH
  /api/hogar/categorias` updates it.
- Variable items: `Budget.dueDate` (YYYY-MM-DD), new column **F** of
  `Budgets`, set when adding/editing the item. The API rejects dates
  outside the budget's month.

**PROD sheet:** both new columns are appended at the end, so the code works
against the PROD sheet without changes (missing cells read as "no date").
Headers `dueDay` (Categories!G1) and `dueDate` (Budgets!F1) were added to
the Test sheet only; add them to PROD when promoting (cosmetic).

## Summary tiles fix (2026-09-29)
`/presupuesto`'s top tiles were wrong: "Ingresos" showed `actualIncomeCents`
(from real Transactions) instead of `plannedIncomeCents`, so it always
read $0 even with fixed income configured — Transactions aren't created
by anything right now. Fixed to show planned income.

**Decided (final, not just a stopgap): there is no separate "actual
spend" layer.** The planned budget (fixed categories from Configuración +
whatever variable amounts, e.g. Misceláneos, get set in Presupuesto) *is*
the month's spend — David explicitly does not want a real-transaction
ledger; changes go through editing/adding a budget line, not logging a
transaction. So:
- **Gastado** = `plannedExpenseCents` (mirrors Planeado, not
  `actualExpenseCents`/Transactions).
- **Por gastar** = `plannedIncomeCents - plannedExpenseCents`.
- Fixed expense rows in Presupuesto's read-only list render with
  `mostrarProgreso={false}` — no more misleading "$0.00 / $X" and a
  permanently-0% progress bar next to each one.

The transaction ledger UI stays archived (not deleted) at
`components/presupuesto/_oculto/RegistroTransaccionesPage.tsx.txt`, and
`Transaction`/`actualCents` stay in the schema (harmless, just unused by
this page) in case this decision changes later — don't remove them
without asking first.

## Fixed category management (2026-09-29)
`/configuracion` now supports creating and deleting fixed categories, not
just editing their amount:
- **Create**: "Agregar gasto/ingreso fijo" (`AgregarCategoria` with
  `fixed`), same component and API (`POST /api/hogar/categorias`) used by
  Presupuesto's variable-category add, just with `fixed: true`.
- **Delete**: a trash icon per row (`FilaPresupuesto onEliminar`) calls
  `DELETE /api/hogar/categorias?id=`. This **archives**, not hard-deletes
  (`archivarCategory` sets `archived=true`) — historical Budget/Transaction
  rows that reference the category id are left alone, the category just
  stops showing up. `/presupuesto`'s read-only fixed list doesn't get this
  button (only Configuración does, by design — Presupuesto stays
  view-only for fixed).

## Datastore environments
Two separate Google Sheets, same schema:
- **"Factura App Tests"** (`GOOGLE_SHEET_ID` in local `.env.local`) — local dev
  and testing. All local work (tabs, seed script, category changes) lands
  here by default.
- **"Facturas App PROD"** (`GOOGLE_SHEET_ID` in Vercel's env vars, Preview
  + Production) — what the deployed app actually reads. Has real login
  credentials for David/Caro (different password hashes than Test).

They do **not** auto-sync. When a schema or data change (new tabs, new
categories, renamed categories, etc.) is ready to ship, it has to be
applied to PROD explicitly as its own step before/alongside deploying —
not assumed to already be there just because it works locally. As of
2026-09-29 both are in sync (21 categories, same household/member ids).

## Tech direction
- **[CHANGED]** Stay on Google Sheets as the datastore for now, to move faster and skip the Postgres/Neon setup step. The new model (household, member, account, category, transaction — see Data model) lives in new sheet tabs (`Households`, `Members`, `Accounts`, `Categories`, `Transactions`), read/written through `lib/household/sheets.ts`, in the same style as the existing `lib/deudas-sheet.ts`. The old `Sheet1`/`Usuarios`/etc. tabs stay untouched until the old routes are removed.
  - Trade-off accepted: no real transactions, whole-sheet reads filtered in memory, eventual consistency on concurrent writes (same limits as the current app). Revisit Postgres later if this becomes a bottleneck — the schema in `lib/household/schema.ts` maps directly to the Drizzle tables previously drafted, so moving later is a lift-and-shift, not a redesign.
- Stay on Vercel (GitHub deploys). Build on a branch, use preview deployments.
- Reuse: password hashing, session signing, DGI QR parser, `usuarios-sheet.ts` (a member links to an existing user by `userId`).
- Replace: `facturas`/`reportes`/`deudas`/`items-fijos` routes and pages, once their replacements exist.
- Rename `middleware.ts` to `proxy.ts` (deprecated convention in this Next version).
- Login rate limiting; revocable sessions (check user active on each session refresh).
- Keep the current URL. Custom subdomain later.

## Build order
1. Schema, auth, household with two members. **Done.**
2. Accounts, categories, manual transactions. **Done.** (`/presupuesto`, `app/api/hogar/transacciones`)
3. Budgets and "left to spend". **Done.** (`app/api/hogar/presupuesto`, `PlanDelMes` component) — monthly planned amount per category, computed actual from transactions, `fixed` categories (rent, utilities) carry their planned amount forward from the last month it was set, shown as "heredado" until explicitly edited for that month.
4. Recurring rules and upcoming bills.
5. Bank import inbox.

## Migration
None. Existing sheet data is old and will not be migrated. The new app starts clean. Keep the current app live on `main` until the new one is ready, then switch.

## UI pivot (2026-09-29)
`/presupuesto` was rebuilt to be compact and informational: summary
totals, then for both gastos and ingresos: a **fixed** section (full
itemized detail, read-only — `FilaPresupuesto readOnly`, edited only from
`/configuracion`) and a **variable** section (editable, same as before)
ending in an "Agregar gasto/ingreso variable" control that creates a new
category on the fly (`POST /api/hogar/categorias`, always `fixed: false`)
and sets its amount for the month in one step — not limited to a closed
list of variable categories. Each variable section ends with a totals
footer (fijos + variables = total del mes).

New `/configuracion` page: set **fixed** expense and income amounts once
(no month picker — always writes to the current month and relies on the
existing carry-forward). This is where rent, utilities, base salaries live.

The transaction ledger (accounts, "¿de quién es?", date/payee/note, the
`Nueva transacción` form + table) was removed from `/presupuesto` — not
deleted, preserved at
`components/presupuesto/_oculto/RegistroTransaccionesPage.tsx.txt` (inert,
`.txt` so it's excluded from the TS build) in case real transaction
tracking comes back later. The `app/api/hogar/transacciones` API is
untouched and still works.

Nav now also shows "Configuración" alongside "Presupuesto".

## Categories (current, applied to the live sheet)
Decided 2026-09-29. Utilities are split, not lumped into one category. Fixed
categories carry their planned amount forward month to month (see Rules
above); variable ones start at $0 each month until someone sets an amount.

Expense — fixed: Renta, Luz y Agua, Internet y Telefonía, Ahorros, Bancos
(loan/card payments + bank fees — NOTE: overlaps with the new Préstamos
and Tarjetas below, not yet reconciled, see Open questions), Comida,
Transporte, Salud, Gastos día a día de Cami (renamed from "Cami"), Mascotas
(2 cats), Ahorros de emergencia, Ahorros de Cami, Préstamos, Tarjetas,
Auto. All added/moved to fixed 2026-09-29.
Expense — variable: Misceláneos, Restaurantes, Entretenimiento (kept from
the original defaults for anything that doesn't fit the categories
above). New variable categories can also be created ad hoc from
`/presupuesto` ("Agregar gasto/ingreso variable").
Income — fixed: Ingreso Base David, Ingreso Base Caro (base salary, one
category per member since it carries forward independently).
Income — variable: Ingreso Variable (side projects/one-off income, shared
across both members — who earned it is tracked per-transaction via
`ownerMemberId`, not by splitting the category).

No new tabs or schema changes were needed for this — `Category.fixed` +
per-month `Budget` already cover it.

## Open questions
- Visibility between members (see default).
- Caps vs envelope budgeting (see default).
- Which banks and their export formats.
- Chat capture channel (Telegram vs WhatsApp) when that phase starts.
- "Bancos" (loan/card payments + fees, decided 2026-09) now overlaps with
  the newer "Préstamos" and "Tarjetas" categories (2026-09-29). Left as-is,
  not auto-merged — ask David/Caro how they want to split it before it
  causes double-counting.
