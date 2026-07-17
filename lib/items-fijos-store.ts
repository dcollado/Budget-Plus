export type ItemFijo = {
  id: string;
  label: string;
  tipo: "ingreso" | "gasto";
  monto: number;
  categoria: string;
  activo: boolean;
  usuarioId: string;
};
