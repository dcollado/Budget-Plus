-- Multi-hogar: correo por usuario, super-admin, rol de miembro acotado y
-- bandera de módulos legacy (facturas/deudas/movimientos viven en la hoja
-- de Google y no son multi-hogar: solo el hogar original los puede usar).

alter table usuarios
  add column email          text,
  add column es_superadmin  boolean not null default false;

create unique index usuarios_email_unico on usuarios (lower(email)) where email is not null;

-- Roles: admin (gestiona miembros de su hogar) o member.
update members set role = 'member' where role not in ('admin', 'member');
-- Los miembros que existen hoy son el hogar original: quedan como admins.
update members set role = 'admin';
alter table members add constraint members_role_check check (role in ('admin', 'member'));

alter table households
  add column usa_modulos_legacy boolean not null default false;
-- Hoy solo existe el hogar original.
update households set usa_modulos_legacy = true;
