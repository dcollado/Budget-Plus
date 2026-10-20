-- Un gasto del proyecto marcado como pagado puede haberse pagado CON lo
-- apartado para el proyecto (entonces baja lo apartado) o POR FUERA (de otro
-- dinero, o antes de empezar: no toca lo apartado). Por defecto, por fuera.
-- Aditiva: el código anterior la ignora.

alter table proyecto_items add column pagado_con_apartado boolean not null default false;
