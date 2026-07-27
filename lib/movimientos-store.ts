export type TipoMovimiento = "ingreso" | "gasto";

export type OrigenMovimiento = "fijo" | "variable" | "factura" | "deuda" | "tarjeta";

export type MetodoPago = "efectivo" | "debito" | "tarjeta";

export type Movimiento = {
  id: string;
  fecha: string;
  tipo: TipoMovimiento;
  origen: OrigenMovimiento;
  monto: string;
  categoria: string;
  descripcion: string;
  mes: string;
  anio: string;
  numeroFactura?: string;
  ruc?: string;
  notas?: string;
  itemFijoId?: string;
  deudaId?: string;
  usuarioId: string;
  metodoPago?: MetodoPago;
  // Por defecto true (cuenta). false = actualiza saldos (ej. tarjeta)
  // pero no se suma a Ingresos/Gastos/Neto ni a "Adónde va el dinero" —
  // para cargos que no son una decisión de gasto propia (comisiones
  // bancarias, cargos automáticos).
  contarComoGasto?: boolean;
};
