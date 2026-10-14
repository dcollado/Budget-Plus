-- Idioma preferido de cada persona ('en' | 'es'). NULL = seguir el del navegador.
-- Aditiva: el código anterior la ignora.
alter table usuarios add column idioma text check (idioma in ('en', 'es'));
