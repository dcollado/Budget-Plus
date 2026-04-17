import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

type QrLookupResponse = {
  success: boolean;
  data?: {
    fecha: string;
    proveedor: string;
    monto: string;
    tipo: string;
    numeroFactura?: string;
    ruc?: string;
  };
  message?: string;
};

function cleanText(value?: string | null): string {
  if (!value) return "";

  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDate(value: string): string {
  if (!value) return "";

  // Ej: 13/04/2026 12:55:29
  const match = value.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+\d{2}:\d{2}:\d{2})?$/
  );

  if (!match) return "";

  const [, dd, mm, yyyy] = match;
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeAmount(value: string): string {
  if (!value) return "";

  return value
    .replace(/[^\d,.-]/g, "")
    .replace(",", ".");
}

function isValidDgiUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "dgi-fep.mef.gob.pa" &&
      parsed.pathname.includes("/Consultas/FacturasPorQR")
    );
  } catch {
    return false;
  }
}

function findValueNearLabel(
  $: cheerio.CheerioAPI,
  labelVariants: string[]
): string {
  const normalizedLabels = labelVariants.map((label) => label.toLowerCase());

  let found = "";

  $("tr, .row, div, td, th, span, p, label").each((_, el) => {
    if (found) return;

    const currentText = cleanText($(el).text());
    const currentLower = currentText.toLowerCase();

    const matchesLabel = normalizedLabels.some((label) =>
      currentLower.includes(label)
    );

    if (!matchesLabel) return;

    // 1) Si es una fila tipo tabla, intenta siguiente celda
    const nextTd = cleanText($(el).next("td").text());
    if (nextTd && nextTd.toLowerCase() !== currentLower) {
      found = nextTd;
      return;
    }

    // 2) Si está dentro de un tr, toma la última celda
    const rowTds = $(el).closest("tr").find("td");
    if (rowTds.length >= 2) {
      const lastTd = cleanText(rowTds.last().text());
      if (lastTd) {
        found = lastTd;
        return;
      }
    }

    // 3) Siguiente hermano
    const nextSiblingText = cleanText($(el).next().text());
    if (nextSiblingText && nextSiblingText.toLowerCase() !== currentLower) {
      found = nextSiblingText;
      return;
    }

    // 4) Busca en el padre
    const parentText = cleanText($(el).parent().text());
    if (parentText && parentText.toLowerCase() !== currentLower) {
      const withoutLabel = normalizedLabels.reduce((acc, label) => {
        return acc.replace(new RegExp(label, "ig"), "");
      }, parentText);

      const cleaned = cleanText(withoutLabel.replace(/[:：]/g, ""));
      if (cleaned) {
        found = cleaned;
      }
    }
  });

  return found;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const qrUrl = String(body?.url || "").trim();

    if (!qrUrl) {
      return NextResponse.json<QrLookupResponse>(
        {
          success: false,
          message: "Falta la URL del QR.",
        },
        { status: 400 }
      );
    }

    if (!isValidDgiUrl(qrUrl)) {
      return NextResponse.json<QrLookupResponse>(
        {
          success: false,
          message: "El QR no corresponde a una URL válida de la DGI.",
        },
        { status: 400 }
      );
    }

    const response = await fetch(qrUrl, {
      method: "GET",
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      return NextResponse.json<QrLookupResponse>(
        {
          success: false,
          message: "No se pudo consultar la página de la DGI.",
        },
        { status: 502 }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const fechaRaw = findValueNearLabel($, [
      "fecha de factura",
      "fecha de emisión",
      "fecha de emision",
      "fecha",
    ]);

    const proveedor = findValueNearLabel($, [
      "nombre del emisor",
      "emisor",
      "nombre comercial del emisor",
      "nombre comercial",
    ]);

    const montoRaw = findValueNearLabel($, [
      "valor total",
      "total pagado",
      "total",
    ]);

    const numeroFactura = findValueNearLabel($, [
      "número de factura",
      "numero de factura",
      "factura",
    ]);

    const ruc = findValueNearLabel($, [
      "ruc del emisor",
      "ruc",
    ]);

    const fecha = normalizeDate(fechaRaw);
    const monto = normalizeAmount(montoRaw);

    if (!fecha && !proveedor && !monto) {
      return NextResponse.json<QrLookupResponse>(
        {
          success: false,
          message:
            "Se consultó la DGI, pero no se pudieron extraer datos útiles de la factura.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json<QrLookupResponse>({
      success: true,
      data: {
        fecha,
        proveedor,
        monto,
        tipo: "Fiscal",
        numeroFactura,
        ruc,
      },
    });
  } catch (error) {
    console.error("Error leyendo QR DGI:", error);

    return NextResponse.json<QrLookupResponse>(
      {
        success: false,
        message: "Ocurrió un error al procesar el QR.",
      },
      { status: 500 }
    );
  }
}