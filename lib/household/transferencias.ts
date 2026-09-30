import type { CategoriaDelMes } from "./presupuesto";
import type { CuentaHogar } from "./usePresupuestoMes";

export type FilaTransferencia = {
  cuentaId: string; // "" = sin cuenta asignada
  nombre: string;
  totalCents: number;
  items: CategoriaDelMes[];
};

export type CuadroTransferencias = {
  filas: FilaTransferencia[];
  totalCents: number;
  salarioCents: number;
  remanenteCents: number;
};

// El cuadro de "cuánto paso a cada cuenta" de UNA persona: sus fijos de
// gasto agrupados por cuenta, más su salario (ingresos fijos a su nombre)
// y lo que le queda. Mensual; lo quincenal es la mitad.
export function armarCuadro(
  items: CategoriaDelMes[],
  cuentas: CuentaHogar[],
  memberId: string
): CuadroTransferencias {
  const mios = items.filter((i) => i.category.fixed && i.category.ownerMemberId === memberId);
  const gastos = mios.filter((i) => i.category.kind === "expense" && i.plannedAmountCents > 0);
  const salarioCents = mios
    .filter((i) => i.category.kind === "income")
    .reduce((t, i) => t + i.plannedAmountCents, 0);

  const cuentasPorId = new Map(cuentas.map((c) => [c.id, c]));
  const grupos = new Map<string, FilaTransferencia>();

  for (const item of gastos) {
    // Una cuenta borrada (o que no existe) cuenta como "sin cuenta".
    const cuenta = cuentasPorId.get(item.category.cuentaId);
    const clave = cuenta ? cuenta.id : "";
    const fila = grupos.get(clave) ?? {
      cuentaId: clave,
      nombre: cuenta ? cuenta.name : "Sin cuenta asignada",
      totalCents: 0,
      items: [],
    };
    fila.totalCents += item.plannedAmountCents;
    fila.items.push(item);
    grupos.set(clave, fila);
  }

  // Cuentas de mayor a menor; "sin cuenta" siempre al final.
  const filas = [...grupos.values()].sort((a, b) => {
    if (!a.cuentaId) return 1;
    if (!b.cuentaId) return -1;
    return b.totalCents - a.totalCents;
  });

  const totalCents = filas.reduce((t, f) => t + f.totalCents, 0);

  return {
    filas,
    totalCents,
    salarioCents,
    remanenteCents: salarioCents - totalCents,
  };
}

// Mitad para la quincena, redondeada al centavo.
export function quincena(cents: number): number {
  return Math.round(cents / 2);
}
