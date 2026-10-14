-- Solicitudes públicas de acceso. Nadie crea cuenta solo: el super-admin las
-- revisa (puede corregir los datos), y al aprobarlas se crea el hogar y se
-- envía la invitación. Aditiva: el código anterior la ignora.

create table solicitudes_acceso (
  id           text primary key default gen_random_uuid()::text,
  nombre       text not null,
  email        text not null,
  hogar        text not null default '',
  mensaje      text not null default '',
  estado       text not null default 'pendiente'
               check (estado in ('pendiente', 'aprobada', 'rechazada')),
  creada_en    timestamptz not null default now(),
  decidida_en  timestamptz,
  decidida_por text references usuarios (id) on delete set null,
  household_id text references households (id) on delete set null
);

create index on solicitudes_acceso (estado, creada_en);
create index on solicitudes_acceso (lower(email));

alter table solicitudes_acceso enable row level security;
