import { fechaDelDia } from "./presupuesto";
import type { Category } from "./schema";

const DIA_MS = 86_400_000;
export const DIAS_ENTRE_PAGOS_BISEMANAL = 14;

const aMs = (fecha: string) => {
  const [a, m, d] = fecha.split("-").map(Number);
  return Date.UTC(a, m - 1, d);
};
const aTexto = (ms: number) => new Date(ms).toISOString().slice(0, 10);

// Las fechas en que cae un pago de este ítem fijo en `month` ("YYYY-MM"):
//   - cada 2 semanas: desde la fecha de referencia, de 14 en 14 días (un mes puede
//     tener 3 pagos);
//   - dos pagos al mes (quincenal): sus dos días;
//   - un pago al mes: su día;
//   - sin día: ninguna (se asume que no se sabe cuándo).
export function fechasDeCobro(
  category: Pick<Category, "quincenal" | "dueDay" | "dueDay2" | "bisemanalDesde">,
  month: string
): string[] {
  if (category.bisemanalDesde) {
    const referencia = aMs(category.bisemanalDesde);
    const [a, m] = month.split("-").map(Number);
    const primero = Date.UTC(a, m - 1, 1);
    const ultimo = Date.UTC(a, m, 0);
    const paso = DIAS_ENTRE_PAGOS_BISEMANAL * DIA_MS;

    const salida: string[] = [];
    for (let t = referencia + Math.ceil((primero - referencia) / paso) * paso; t <= ultimo; t += paso) {
      salida.push(aTexto(t));
    }
    return salida;
  }

  const dias = category.quincenal ? [category.dueDay, category.dueDay2] : [category.dueDay];
  return dias
    .map((d) => fechaDelDia(month, d))
    .filter(Boolean)
    .sort();
}
