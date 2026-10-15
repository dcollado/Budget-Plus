-- Notas y marca de "pagado" por ítem del mes (gastos extra). Viven en el
-- presupuesto del mes, no en la categoría: cada mes es independiente.
-- Aditiva: el código anterior las ignora.
alter table budgets add column nota text not null default '';
alter table budgets add column pagado boolean not null default false;
