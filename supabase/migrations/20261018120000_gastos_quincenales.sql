-- Gastos fijos que se pagan dos veces al mes (por ejemplo el 15 y fin de mes).
-- El monto del mes sigue siendo el total mensual: cada pago es la mitad.
-- due_day / due_day_2 son los dos días (31 = último día del mes).
-- Aditiva: el código anterior la ignora.
alter table categories add column quincenal boolean not null default false;
alter table categories add column due_day_2 smallint check (due_day_2 between 1 and 31);
