-- Invitaciones por correo (alta de miembros/admins) y recuperación de
-- contraseña. Los tokens nunca se guardan en claro: solo su hash SHA-256.

create table invitaciones (
  id           text primary key default gen_random_uuid()::text,
  household_id text not null references households (id) on delete cascade,
  email        text not null,
  role         text not null default 'member' check (role in ('admin', 'member')),
  token_hash   text not null unique,
  invited_by   text references usuarios (id),
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  used_at      timestamptz
);

create index on invitaciones (household_id);
create index on invitaciones (lower(email));

create table password_resets (
  id         text primary key default gen_random_uuid()::text,
  user_id    text not null references usuarios (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at    timestamptz
);

create index on password_resets (user_id, created_at);

alter table invitaciones    enable row level security;
alter table password_resets enable row level security;
