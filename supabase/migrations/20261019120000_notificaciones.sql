-- Notificaciones dentro de la app (campana): recordatorios de pago y avisos.
-- Cada fila es de una sola persona. "clave" evita duplicados (la misma
-- notificación no se crea dos veces para la misma persona). "datos" guarda lo
-- que hace falta para escribir el texto en el idioma de quien lo lee.
-- Aditiva: el código anterior la ignora.

create table notificaciones (
  id         bigserial primary key,
  usuario_id text not null references usuarios (id) on delete cascade,
  tipo       text not null,
  clave      text not null,
  datos      jsonb not null default '{}',
  enlace     text not null default '',
  creada_en  timestamptz not null default now(),
  leida_en   timestamptz,
  unique (usuario_id, clave)
);

create index on notificaciones (usuario_id, creada_en desc);

alter table notificaciones enable row level security;
