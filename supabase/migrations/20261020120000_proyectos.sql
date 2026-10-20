-- Proyectos grandes del hogar (viaje, remodelación…): una lista de ítems con
-- precio y fecha, de la que se calcula la cuota mínima de ahorro.
-- "objetivo_cents" es solo una referencia; 0 = sin objetivo.
-- Aditiva: el código anterior la ignora.

create table proyectos (
  id             text primary key default gen_random_uuid()::text,
  household_id   text not null references households (id) on delete cascade,
  name           text not null,
  target_date    date not null,
  objetivo_cents bigint not null default 0 check (objetivo_cents >= 0),
  ahorrado_cents bigint not null default 0 check (ahorrado_cents >= 0),
  archived       boolean not null default false,
  created_at     timestamptz not null default now()
);

create index on proyectos (household_id) where not archived;

create table proyecto_items (
  id           text primary key default gen_random_uuid()::text,
  project_id   text not null references proyectos (id) on delete cascade,
  household_id text not null references households (id) on delete cascade,
  concepto     text not null,
  monto_cents  bigint not null check (monto_cents >= 0),
  fecha        date, -- null = sin fecha (se asume target_date)
  pagado       boolean not null default false
);

create index on proyecto_items (project_id);
create index on proyecto_items (household_id);

alter table proyectos enable row level security;
alter table proyecto_items enable row level security;

-- Lo que cada persona decide apartar por mes para un proyecto. Sin fila = no
-- lo ha decidido todavía (la app muestra una sugerencia).
create table proyecto_aportes (
  project_id   text not null references proyectos (id) on delete cascade,
  member_id    text not null references members (id) on delete cascade,
  household_id text not null references households (id) on delete cascade,
  monto_cents  bigint not null check (monto_cents >= 0),
  updated_at   timestamptz not null default now(),
  primary key (project_id, member_id)
);

create index on proyecto_aportes (household_id);

alter table proyecto_aportes enable row level security;
