-- Módulos por hogar: la tabla "modulos" es el valor por defecto de todos los
-- hogares; aquí van las excepciones de un hogar concreto (encendido o apagado).
-- Sin fila = el hogar usa el valor por defecto. Aditiva: el código anterior la
-- ignora.

create table modulos_hogar (
  household_id   text not null references households (id) on delete cascade,
  clave          text not null,
  activo         boolean not null,
  actualizado_en timestamptz not null default now(),
  primary key (household_id, clave)
);

alter table modulos_hogar enable row level security;
