-- Calendario de Google propio de cada hogar. NULL = sin calendario propio:
-- el hogar original (sincroniza_calendario) sigue usando GOOGLE_CALENDAR_ID.
-- Aditiva: el código anterior la ignora.
alter table households add column calendar_id text;
