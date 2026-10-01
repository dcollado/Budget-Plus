-- Esquema inicial: las mismas hojas que hoy viven en Google Sheets, como
-- tablas de Postgres. Los ids son texto para copiar tal cual los de la
-- hoja (uuid, o "1" en Usuarios). El dinero va en centavos (bigint).
-- "" en la hoja (sin dueño, sin cuenta) pasa a NULL acá.

create table usuarios (
  id            text primary key,
  nombre        text not null default '',
  usuario       text not null unique,
  password_hash text not null,
  activo        boolean not null default true
);

create table households (
  id   text primary key default gen_random_uuid()::text,
  name text not null
);

create table members (
  id           text primary key default gen_random_uuid()::text,
  household_id text not null references households (id) on delete cascade,
  user_id      text not null references usuarios (id),
  display_name text not null default '',
  role         text not null default 'member',
  unique (user_id)
);

create table accounts (
  id                    text primary key default gen_random_uuid()::text,
  household_id          text not null references households (id) on delete cascade,
  name                  text not null,
  type                  text not null default 'cash' check (type in ('cash', 'bank', 'card', 'loan')),
  owner_member_id       text references members (id), -- null = conjunta
  opening_balance_cents bigint not null default 0,
  archived              boolean not null default false
);

-- Destinos de transferencia ("Cuenta Chippu", "Emergencias"...).
create table cuentas (
  id           text primary key default gen_random_uuid()::text,
  household_id text not null references households (id) on delete cascade,
  name         text not null,
  archived     boolean not null default false
);

create table categories (
  id              text primary key default gen_random_uuid()::text,
  household_id    text not null references households (id) on delete cascade,
  name            text not null,
  kind            text not null check (kind in ('expense', 'income')),
  archived        boolean not null default false,
  fixed           boolean not null default false,
  due_day         smallint check (due_day between 1 and 31), -- null = sin fecha
  owner_member_id text references members (id),               -- null = conjunto
  cuenta_id       text references cuentas (id)                -- null = sin asignar
);

create table budgets (
  id                   text primary key default gen_random_uuid()::text,
  household_id         text not null references households (id) on delete cascade,
  category_id          text not null references categories (id),
  month                text not null check (month ~ '^\d{4}-\d{2}$'), -- YYYY-MM
  planned_amount_cents bigint not null default 0 check (planned_amount_cents >= 0),
  due_date             date, -- solo variables; null = sin fecha
  -- Un monto por categoría y mes (lo que hoy hace upsertBudget).
  unique (category_id, month)
);

create table transactions (
  id                   text primary key default gen_random_uuid()::text,
  household_id         text not null references households (id) on delete cascade,
  account_id           text references accounts (id),
  transfer_account_id  text references accounts (id), -- solo type = 'transfer'
  category_id          text references categories (id),
  type                 text not null check (type in ('expense', 'income', 'transfer')),
  amount_cents         bigint not null check (amount_cents >= 0),
  date                 date not null,
  payee                text not null default '',
  note                 text not null default '',
  created_by_member_id text references members (id),
  owner_member_id      text references members (id), -- null = conjunto
  source               text not null default 'manual' check (source in ('manual', 'import', 'chat', 'qr')),
  external_id          text not null default '',
  created_at           timestamptz not null default now()
);

create index on members (household_id);
create index on categories (household_id);
create index on cuentas (household_id);
create index on budgets (household_id, month);
create index on transactions (household_id, date);

-- La app entra solo desde el servidor (conexión directa / service role),
-- nunca desde el navegador. RLS activado sin políticas = la API pública
-- de Supabase (clave anon) no puede leer ni escribir nada.
alter table usuarios     enable row level security;
alter table households   enable row level security;
alter table members      enable row level security;
alter table accounts     enable row level security;
alter table cuentas      enable row level security;
alter table categories   enable row level security;
alter table budgets      enable row level security;
alter table transactions enable row level security;
