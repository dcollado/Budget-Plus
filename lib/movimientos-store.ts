export type TipoMovimiento = "ingreso" | "gasto";

export type OrigenMovimiento = "fijo" | "variable" | "factura";

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
};
