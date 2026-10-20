-- Quién pagó un gasto del proyecto "por fuera", cuándo, y el gasto extra que se
-- creó en Presupuesto para reflejarlo (así baja lo que esa persona tiene libre
-- ese mes). Aditiva: el código anterior la ignora.

alter table proyecto_items
  add column pagado_por text references members (id) on delete set null,
  add column pagado_fecha date,
  add column gasto_categoria_id text references categories (id) on delete set null;
