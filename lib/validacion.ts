// Validaciones de entrada compartidas por las rutas. Todo lo que llega del
// cliente es `unknown` hasta pasar por acá.

const MAX_CENTAVOS = 1_000_000_000_000; // 10 mil millones de dólares

export function mesValido(valor: unknown): valor is string {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}$/.test(valor)) return false;
  const mes = Number(valor.slice(5));
  return mes >= 1 && mes <= 12;
}

// "YYYY-MM-DD" que existe en el calendario (rechaza 2026-02-31).
export function fechaValida(valor: unknown): valor is string {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [anio, mes, dia] = valor.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}

// Dólares (número o texto) a centavos enteros, o null si no es un monto
// válido. Se lee el texto del número en vez de multiplicar el float: así
// 1.005 da 101 y no 100 por el error binario.
export function centavosDe(valor: unknown): number | null {
  let texto: string;

  if (typeof valor === "number") {
    if (!Number.isFinite(valor) || valor < 0) return null;
    texto = String(valor);
    // Notación científica (1e-7, 1e21): no es un monto que alguien escriba.
    if (/e/i.test(texto)) return null;
  } else if (typeof valor === "string") {
    texto = valor.trim();
  } else {
    return null;
  }

  const m = /^(\d+)(?:\.(\d+))?$/.exec(texto);
  if (!m) return null;

  const decimales = (m[2] ?? "").padEnd(3, "0");
  let centavos = Number(m[1]) * 100 + Number(decimales.slice(0, 2));
  if (Number(decimales[2]) >= 5) centavos += 1;

  return Number.isSafeInteger(centavos) && centavos <= MAX_CENTAVOS ? centavos : null;
}
