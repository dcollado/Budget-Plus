export function formatearCentavos(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

const MESES_CORTOS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

const MESES_LARGOS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// "2026-09-15" -> "15 sep". "" -> "".
export function formatearFechaCorta(fecha: string): string {
  const [, mes, dia] = fecha.split("-");
  if (!mes || !dia) return "";
  return `${Number(dia)} ${MESES_CORTOS[Number(mes) - 1] ?? ""}`;
}

// "2026-09" -> "septiembre 2026".
export function formatearMes(month: string): string {
  const [anio, mes] = month.split("-");
  return `${MESES_LARGOS[Number(mes) - 1] ?? mes} ${anio}`;
}

// "2026-12" -> "2027-01".
export function mesSiguiente(month: string): string {
  const [anio, mes] = month.split("-").map(Number);
  const fecha = new Date(anio, mes, 1);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
}
