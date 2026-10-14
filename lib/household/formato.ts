export function formatearCentavos(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function nombreMes(mes: number, locale: string, estilo: "short" | "long"): string {
  const texto = new Intl.DateTimeFormat(locale, { month: estilo, timeZone: "UTC" }).format(
    new Date(Date.UTC(2000, mes - 1, 1))
  );
  return texto.endsWith(".") ? texto.slice(0, -1) : texto;
}

// "2026-09-15" -> "15 Sep" (en) / "15 sept" (es). "" -> "".
export function formatearFechaCorta(fecha: string, locale = "en"): string {
  const [, mes, dia] = fecha.split("-");
  if (!mes || !dia) return "";
  return `${Number(dia)} ${nombreMes(Number(mes), locale, "short")}`;
}

// "2026-09" -> "September 2026" (en) / "Septiembre 2026" (es).
export function formatearMes(month: string, locale = "en"): string {
  const [anio, mes] = month.split("-");
  const nombre = nombreMes(Number(mes), locale, "long");
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`;
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
