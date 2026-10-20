-- Ingresos que se cobran cada 2 semanas: una fecha de pago de referencia; de ahí
-- salen todos los pagos (cada 14 días). null = no es bisemanal. Aditiva: el
-- código anterior la ignora.

alter table categories add column bisemanal_desde date;
