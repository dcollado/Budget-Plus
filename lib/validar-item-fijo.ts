import { categoriasFactura, categoriasIngreso } from "@/lib/facturas";
import type { ItemFijo } from "@/lib/items-fijos-store";

export type ResultadoValidacionItemFijo =
  | { ok: true; data: Omit<ItemFijo, "id" | "usuarioId"> }
  | { ok: false; errores: string[] };

const MAX_TEXTO = 200;

export function validarItemFijo(body: unknown): ResultadoValidacionItemFijo {
  const errores: string[] = [];
  const b = (body ?? {}) as Record<string, unknown>;

  const label = String(b.label ?? "").trim();
  const tipo = String(b.tipo ?? "").trim();
  const montoRaw = String(b.monto ?? "").trim();
  const categoria = String(b.categoria ?? "").trim();
  const activo = b.activo !== false; // por defecto activo, salvo que se envíe false explícito

  if (!label) errores.push("El nombre es obligatorio.");
  else if (label.length > MAX_TEXTO)
    errores.push(`El nombre no puede superar ${MAX_TEXTO} caracteres.`);

  if (tipo !== "ingreso" && tipo !== "gasto") {
    errores.push("El tipo debe ser ingreso o gasto.");
  }

  const montoNum = Number(montoRaw.replace(",", "."));
  if (!montoRaw) {
    errores.push("El monto es obligatorio.");
  } else if (!Number.isFinite(montoNum) || montoNum <= 0) {
    errores.push("El monto debe ser un número mayor que cero.");
  }

  if (!categoria) {
    errores.push("La categoría es obligatoria.");
  } else if (tipo === "gasto" && !categoriasFactura.includes(categoria)) {
    errores.push("La categoría seleccionada no es válida para un gasto.");
  } else if (tipo === "ingreso" && !categoriasIngreso.includes(categoria)) {
    errores.push("La categoría seleccionada no es válida para un ingreso.");
  }

  if (errores.length > 0) {
    return { ok: false, errores };
  }

  return {
    ok: true,
    data: {
      label,
      tipo: tipo as "ingreso" | "gasto",
      monto: montoNum,
      categoria,
      activo,
    },
  };
}
