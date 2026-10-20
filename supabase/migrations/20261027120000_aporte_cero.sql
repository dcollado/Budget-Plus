-- Un aporte de 0 es válido: la persona dice "este mes no puedo aportar" y la
-- sugerencia deja de empujarla. Antes solo se permitían montos > 0 (el 0 borraba
-- la fila). Solo afloja la regla: el código anterior sigue funcionando.

alter table proyecto_aportes_mes drop constraint if exists proyecto_aportes_mes_monto_cents_check;
alter table proyecto_aportes_mes add constraint proyecto_aportes_mes_monto_cents_check check (monto_cents >= 0);
