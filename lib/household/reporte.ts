import { armarVistaMes } from "./presupuesto";
import type { Budget, Category } from "./schema";

// Reporte anual (V1): todo sale del PLAN (presupuesto), con la misma lógica
// de herencia que usa Presupuesto. Ojo: sumar la tabla de presupuestos
// directo daría cifras falsas porque solo guarda los meses que alguien editó.

export type FilaMes = {
  month: string; // YYYY-MM
  ingresosCents: number;
  fijosCents: number;
  variablesCents: number;
  // Parte de los fijos marcada como ahorro (ya está incluida en fijos).
  ahorroCents: number;
  sobranteCents: number;
};

export type FilaPersona = {
  // "" = conjunto (sin dueño).
  memberId: string;
  nombre: string;
  color?: number;
  ingresosCents: number;
  gastosCents: number;
  ahorroCents: number;
  sobranteCents: number;
};

export type Extraordinario = {
  fecha: string; // YYYY-MM-DD, o el primer día del mes si no tiene fecha
  month: string;
  nombre: string;
  montoCents: number;
  ownerMemberId: string;
};

export type ReporteAnual = {
  year: number;
  meses: FilaMes[];
  totales: Omit<FilaMes, "month">;
  personas: FilaPersona[];
  extraordinarios: Extraordinario[];
  // Cuántas categorías están marcadas como ahorro (0 = aún no marcaron).
  categoriasAhorro: number;
};

type Miembro = { id: string; displayName: string; color?: number };

export function armarReporteAnual(
  year: number,
  categories: Category[],
  budgets: Budget[],
  members: Miembro[]
): ReporteAnual {
  const meses: FilaMes[] = [];
  const extraordinarios: Extraordinario[] = [];

  const porPersona = new Map<string, FilaPersona>();
  const persona = (memberId: string): FilaPersona => {
    let p = porPersona.get(memberId);
    if (!p) {
      const m = members.find((x) => x.id === memberId);
      p = {
        memberId,
        nombre: memberId ? (m?.displayName ?? "Otro") : "Conjunto",
        color: m?.color,
        ingresosCents: 0,
        gastosCents: 0,
        ahorroCents: 0,
        sobranteCents: 0,
      };
      porPersona.set(memberId, p);
    }
    return p;
  };

  for (let m = 1; m <= 12; m += 1) {
    const month = `${year}-${String(m).padStart(2, "0")}`;
    const fila: FilaMes = {
      month,
      ingresosCents: 0,
      fijosCents: 0,
      variablesCents: 0,
      ahorroCents: 0,
      sobranteCents: 0,
    };

    for (const item of armarVistaMes(categories, budgets, [], month)) {
      const monto = item.plannedAmountCents;
      if (monto <= 0) continue;

      const dueno = persona(item.category.ownerMemberId);

      if (item.category.kind === "income") {
        fila.ingresosCents += monto;
        dueno.ingresosCents += monto;
        continue;
      }

      dueno.gastosCents += monto;

      if (item.category.fixed) {
        fila.fijosCents += monto;
        if (item.category.ahorro) {
          fila.ahorroCents += monto;
          dueno.ahorroCents += monto;
        }
      } else {
        fila.variablesCents += monto;
        extraordinarios.push({
          fecha: item.fechaPago || `${month}-01`,
          month,
          nombre: item.category.name,
          montoCents: monto,
          ownerMemberId: item.category.ownerMemberId,
        });
      }
    }

    fila.sobranteCents = fila.ingresosCents - fila.fijosCents - fila.variablesCents;
    meses.push(fila);
  }

  const totales = meses.reduce(
    (t, f) => ({
      ingresosCents: t.ingresosCents + f.ingresosCents,
      fijosCents: t.fijosCents + f.fijosCents,
      variablesCents: t.variablesCents + f.variablesCents,
      ahorroCents: t.ahorroCents + f.ahorroCents,
      sobranteCents: t.sobranteCents + f.sobranteCents,
    }),
    { ingresosCents: 0, fijosCents: 0, variablesCents: 0, ahorroCents: 0, sobranteCents: 0 }
  );

  const personas = [...porPersona.values()]
    .map((p) => ({ ...p, sobranteCents: p.ingresosCents - p.gastosCents }))
    // Personas primero (con nombre), "Conjunto" al final.
    .sort((a, b) => (a.memberId === "" ? 1 : b.memberId === "" ? -1 : a.nombre.localeCompare(b.nombre)));

  extraordinarios.sort((a, b) => a.fecha.localeCompare(b.fecha));

  return {
    year,
    meses,
    totales,
    personas,
    extraordinarios,
    categoriasAhorro: categories.filter((c) => c.ahorro && !c.archived).length,
  };
}
