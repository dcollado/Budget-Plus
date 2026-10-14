-- Aislamiento entre hogares a nivel de base: cualquier referencia (categoría,
-- cuenta, miembro) tiene que ser del MISMO hogar que la fila que la usa. Las
-- llaves foráneas compuestas lo garantizan aunque una ruta olvide validar.
-- (Con NULL en la referencia no se comprueba, que es lo que queremos.)

alter table members    add constraint members_id_hogar_unico    unique (id, household_id);
alter table accounts   add constraint accounts_id_hogar_unico   unique (id, household_id);
alter table cuentas    add constraint cuentas_id_hogar_unico    unique (id, household_id);
alter table categories add constraint categories_id_hogar_unico unique (id, household_id);

alter table accounts
  add constraint accounts_owner_mismo_hogar
  foreign key (owner_member_id, household_id) references members (id, household_id);

alter table categories
  add constraint categories_owner_mismo_hogar
  foreign key (owner_member_id, household_id) references members (id, household_id),
  add constraint categories_cuenta_mismo_hogar
  foreign key (cuenta_id, household_id) references cuentas (id, household_id);

alter table budgets
  add constraint budgets_categoria_mismo_hogar
  foreign key (category_id, household_id) references categories (id, household_id);

alter table transactions
  add constraint transactions_cuenta_mismo_hogar
  foreign key (account_id, household_id) references accounts (id, household_id),
  add constraint transactions_destino_mismo_hogar
  foreign key (transfer_account_id, household_id) references accounts (id, household_id),
  add constraint transactions_categoria_mismo_hogar
  foreign key (category_id, household_id) references categories (id, household_id),
  add constraint transactions_creador_mismo_hogar
  foreign key (created_by_member_id, household_id) references members (id, household_id),
  add constraint transactions_owner_mismo_hogar
  foreign key (owner_member_id, household_id) references members (id, household_id);

-- Calendario: solo los hogares marcados escriben en el Google Calendar
-- compartido. Hoy, solo el hogar original.
alter table households
  add column sincroniza_calendario boolean not null default false;
update households set sincroniza_calendario = true where usa_modulos_legacy;
