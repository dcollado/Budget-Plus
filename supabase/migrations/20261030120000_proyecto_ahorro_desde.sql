-- Desde qué mes se empieza a ahorrar para un proyecto ("YYYY-MM"). null = desde
-- el mes actual (como hasta ahora). Sirve para no repartir el ahorro en meses en
-- los que ya se está ahorrando para otro proyecto. Aditiva: el código anterior la
-- ignora.

alter table proyectos
  add column ahorro_desde text check (ahorro_desde ~ '^\d{4}-(0[1-9]|1[0-2])$');
