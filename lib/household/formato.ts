export function formatearCentavos(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

const MESES_CORTOS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MESES_LARGOS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// "2026-09-15" -> "15 Sep". "" -> "".
export function formatearFechaCorta(fecha: string): string {
  const [, mes, dia] = fecha.split("-");
  if (!mes || !dia) return "";
  return `${Number(dia)} ${MESES_CORTOS[Number(mes) - 1] ?? ""}`;
}

// "2026-09" -> "September 2026".
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

// Mes de "hoy" en Panamá (UTC-5, sin horario de verano), "YYYY-MM". Una sola
// definición para servidor y cliente: con la hora local del servidor (UTC) el
// mes cambiaba a las 7 pm del último día.
export function mesActual(ahora: number = Date.now()): string {
  const panama = new Date(ahora - 5 * 60 * 60 * 1000);
  return `${panama.getUTCFullYear()}-${String(panama.getUTCMonth() + 1).padStart(2, "0")}`;
}
