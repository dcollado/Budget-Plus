-- Módulos de la app que el super-admin puede encender o apagar (Reportes,
-- Proyectos…). Una fila por módulo; sin fila = encendido. Aditiva: el código
-- anterior la ignora.

create table modulos (
  clave         text primary key,
  activo        boolean not null default true,
  actualizado_en timestamptz not null default now()
);

alter table modulos enable row level security;
