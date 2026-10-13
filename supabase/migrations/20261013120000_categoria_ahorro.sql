-- Marca de "ahorro" por categoría: el reporte anual muestra cuánto se aparta.
-- Aditiva: el código anterior la ignora.
alter table categories add column es_ahorro boolean not null default false;
