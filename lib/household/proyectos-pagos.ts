import { archivarCategory, crearCategory, upsertBudget } from "./datos";

// Un gasto del proyecto pagado "por fuera" (del bolsillo de alguien) se refleja
// en Presupuesto como un gasto extra de esa persona, en el mes en que se pagó:
// así lo que tiene libre ese mes baja solo y no hay dos lugares con el mismo dato.

// Crea el gasto extra y devuelve el id de su categoría. `pagadoPor` vacío = conjunto
// (no baja lo libre de nadie).
export async function registrarGastoDelItem(datos: {
  householdId: string;
  proyecto: string;
  concepto: string;
  montoCents: number;
  pagadoPor: string;
  fecha: string; // YYYY-MM-DD
}): Promise<string> {
  const categoria = await crearCategory({
    householdId: datos.householdId,
    name: `${datos.proyecto}: ${datos.concepto}`.slice(0, 120),
    kind: "expense",
    fixed: false,
    ownerMemberId: datos.pagadoPor,
  });

  await upsertBudget(datos.householdId, categoria.id, datos.fecha.slice(0, 7), datos.montoCents, datos.fecha, {
    nota: datos.proyecto,
    pagado: true,
  });

  return categoria.id;
}

// El pago se deshizo (o cambió): el gasto extra deja de existir.
export async function retirarGastoDelItem(householdId: string, categoriaId: string): Promise<void> {
  if (categoriaId) await archivarCategory(categoriaId, householdId);
}

// El monto del ítem cambió: se actualiza el gasto extra.
export async function ajustarGastoDelItem(
  householdId: string,
  categoriaId: string,
  fecha: string,
  montoCents: number
): Promise<void> {
  if (!categoriaId || !fecha) return;
  await upsertBudget(householdId, categoriaId, fecha.slice(0, 7), montoCents);
}
