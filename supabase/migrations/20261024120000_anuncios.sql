-- Novedades (anuncios de lanzamiento) que administra el super-admin: de cada una
-- sale una notificación en la campana y un aviso al entrar a la app. "dias" es
-- cuánto tiempo está vivo, contado desde fecha_inicio. Aditiva: el código
-- anterior la ignora. Se siembran las dos novedades que antes vivían en el código.

create table anuncios (
  id           text primary key,
  fecha_inicio date not null,
  dias         smallint not null default 30 check (dias between 1 and 60),
  activo       boolean not null default true,
  titulo_en    text not null,
  titulo_es    text not null,
  texto_en     text not null,
  texto_es     text not null,
  enlace       text not null,
  creado_en    timestamptz not null default now()
);

alter table anuncios enable row level security;

insert into anuncios (id, fecha_inicio, dias, titulo_en, titulo_es, texto_en, texto_es, enlace) values
  ('guia-2026-10', '2026-10-20', 30,
   'A guide inside the app', 'Una guía dentro de la app',
   'There is a new Guide that explains how each part of the app works. Look for the ? icon at the top.',
   'Hay una nueva Guía que explica cómo funciona cada parte de la app. Busca el ícono ? de arriba.',
   '/guia'),
  ('proyectos-2026-10', '2026-10-20', 30,
   'Projects for big expenses', 'Proyectos para gastos grandes',
   'Plan a trip or any big expense: list what you have to pay and see how much to set aside each month.',
   'Planifica un viaje o cualquier gasto grande: anota lo que hay que pagar y mira cuánto apartar cada mes.',
   '/proyectos')
on conflict (id) do nothing;
