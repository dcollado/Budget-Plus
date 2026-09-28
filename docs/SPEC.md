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

## Open questions
- Visibility between members (see default).
- Caps vs envelope budgeting (see default).
- Which banks and their export formats.
- Chat capture channel (Telegram vs WhatsApp) when that phase starts.
