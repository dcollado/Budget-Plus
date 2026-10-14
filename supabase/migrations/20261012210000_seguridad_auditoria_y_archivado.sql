-- Seguridad de login, sesiones revocables, auditoría, color por persona y
-- archivado de hogares.

-- Intentos fallidos de login (por usuario y por IP) para frenar fuerza bruta.
create table login_intentos (
  id    bigserial primary key,
  clave text not null,                 -- 'u:<usuario>' o 'ip:<ip>'
  at    timestamptz not null default now()
);
create index on login_intentos (clave, at);
alter table login_intentos enable row level security;

-- Cada cambio de contraseña sube la versión: las sesiones anteriores
-- (que llevan la versión vieja en el token) dejan de valer.
alter table usuarios add column sesion_version integer not null default 0;

-- Registro de acciones administrativas. Sin llaves foráneas a propósito:
-- tiene que sobrevivir a que se borre un hogar o una cuenta.
create table eventos_admin (
  id             bigserial primary key,
  at             timestamptz not null default now(),
  actor_user_id  text,
  actor_nombre   text not null default '',
  household_id   text,
  household_name text not null default '',
  accion         text not null,
  objetivo       text not null default '',
  detalle        text not null default ''
);
create index on eventos_admin (at desc);
alter table eventos_admin enable row level security;

-- Color por persona: índice en una paleta (0 azul, 1 rojo, ...). Los
-- miembros actuales conservan lo que ya se veía (nombre con "c" = rojo).
alter table members add column color smallint;
update members set color = case when lower(display_name) like 'c%' then 1 else 0 end;

-- Archivado de hogares: archivado = nadie entra, los datos se conservan.
alter table households add column archivado_en timestamptz;
