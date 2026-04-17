type ParsedQrFactura = {
  fecha?: string;
  proveedor?: string;
  monto?: string;
};

export function parseQrFactura(raw: string): ParsedQrFactura {
  const text = raw.trim();

  // 1) Si el QR trae JSON
  try {
    const json = JSON.parse(text);

    return {
      fecha: normalizeDate(
        json.fecha ||
          json.date ||
          json.invoiceDate ||
          json.fechaEmision ||
          ""
      ),
      proveedor: String(
        json.proveedor ||
          json.emisor ||
          json.supplier ||
          json.nombreComercio ||
          ""
      ).trim(),
      monto: normalizeAmount(
        json.monto ||
          json.total ||
          json.amount ||
          json.totalFactura ||
          ""
      ),
    };
  } catch {
    // seguimos con otros formatos
  }

  // 2) Texto libre con patrones comunes
  const fechaMatch =
    text.match(/fecha[:=]\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i) ||
    text.match(/fecha[:=]\s*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/i) ||
    text.match(/date[:=]\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i) ||
    text.match(/date[:=]\s*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/i);

  const proveedorMatch =
    text.match(/proveedor[:=]\s*([^\n|;]+)/i) ||
    text.match(/emisor[:=]\s*([^\n|;]+)/i) ||
    text.match(/supplier[:=]\s*([^\n|;]+)/i);

  const montoMatch =
    text.match(/monto[:=]\s*([0-9]+(?:[.,][0-9]{1,2})?)/i) ||
    text.match(/total[:=]\s*([0-9]+(?:[.,][0-9]{1,2})?)/i) ||
    text.match(/amount[:=]\s*([0-9]+(?:[.,][0-9]{1,2})?)/i);

  return {
    fecha: normalizeDate(fechaMatch?.[1]),
    proveedor: proveedorMatch?.[1]?.trim() || "",
    monto: normalizeAmount(montoMatch?.[1]),
  };
}

function normalizeDate(value?: string): string {
  if (!value) return "";

  const trimmed = value.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // DD/MM/YYYY -> YYYY-MM-DD
  const ddmmyyyy = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    return `${yyyy}-${mm}-${dd}`;
  }

  return "";
}

function normalizeAmount(value?: string | number): string {
  if (value === undefined || value === null) return "";

  return String(value).trim().replace(",", ".");
}