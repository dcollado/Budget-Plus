-- Lo que cada persona aparta para un proyecto, MES A MES (reemplaza al aporte
-- mensual fijo y al aporte extra). "hecho" = ya lo apartó; esos montos se
-- suman a lo apartado del proyecto. Poner 0 borra la fila.
-- Aditiva en producción: solo crea una tabla. Las tablas proyecto_aportes
-- (aporte mensual) queda sin uso; se podrá borrar más adelante.

create table proyecto_aportes_mes (
  project_id   text not null references proyectos (id) on delete cascade,
  member_id    text not null references members (id) on delete cascade,
  household_id text not null references households (id) on delete cascade,
  month        text not null check (month ~ '^\d{4}-\d{2}$'), -- YYYY-MM
  monto_cents  bigint not null check (monto_cents > 0),
  hecho        boolean not null default false,
  updated_at   timestamptz not null default now(),
  primary key (project_id, member_id, month)
);

create index on proyecto_aportes_mes (household_id);

alter table proyecto_aportes_mes enable row level security;

-- Solo existe en desarrollo (el aporte extra no se lanzó a producción).
drop table if exists proyecto_aportes_extra;
