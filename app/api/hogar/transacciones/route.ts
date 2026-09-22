import { NextRequest, NextResponse } from "next/server";
import { getUsuarioId } from "@/lib/current-user";
import { getContextoHogar } from "@/lib/household/contexto";
import {
  crearTransaction,
  eliminarTransaction,
  listTransactions,
} from "@/lib/household/sheets";
import type {
  TransactionSource,
  TransactionType,
} from "@/lib/household/schema";

const TIPOS: TransactionType[] = ["expense", "income", "transfer"];
const FUENTES: TransactionSource[] = ["manual", "import", "chat", "qr"];

function sinHogar() {
  return NextResponse.json(
    {
      success: false,
      message:
        "Tu usuario todavía no tiene un hogar configurado. Corré el script de seed.",
    },
    { status: 409 }
  );
}

export async function GET(req: NextRequest) {
  try {
    const usuarioId = getUsuarioId(req);

    if (!usuarioId) {
      return NextResponse.json(
        { success: false, message: "No autorizado." },
        { status: 401 }
      );
    }

    const contexto = await getContextoHogar(usuarioId);

    if (!contexto) {
      return sinHogar();
    }

    const periodo = req.nextUrl.searchParams.get("periodo")?.trim();
    let transacciones = await listTransactions(contexto.householdId);

    if (periodo && /^\d{4}-\d{2}$/.test(periodo)) {
      transacciones = transacciones.filter((t) => t.date.startsWith(periodo));
    }

    transacciones.sort((a, b) => b.date.localeCompare(a.date));

    return NextResponse.json({ success: true, data: transacciones });
  } catch (error) {
    console.error("Error obteniendo transacciones:", error);

    return NextResponse.json(
      { success: false, message: "No se pudieron obtener las transacciones." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const usuarioId = getUsuarioId(req);

    if (!usuarioId) {
      return NextResponse.json(
        { success: false, message: "No autorizado." },
        { status: 401 }
      );
    }

    const contexto = await getContextoHogar(usuarioId);

    if (!contexto) {
      return sinHogar();
    }

    const body = (await req.json()) as Record<string, unknown>;

    const type = String(body.type ?? "");
    const accountId = String(body.accountId ?? "").trim();
    const date = String(body.date ?? "").trim();
    const amount = Number(body.amount);

    if (!TIPOS.includes(type as TransactionType)) {
      return NextResponse.json(
        { success: false, message: "Tipo de transacción inválido." },
        { status: 400 }
      );
    }

    if (!accountId) {
      return NextResponse.json(
        { success: false, message: "Falta la cuenta." },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { success: false, message: "Fecha inválida." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, message: "El monto debe ser mayor a 0." },
        { status: 400 }
      );
    }

    const transferAccountId =
      type === "transfer" ? String(body.transferAccountId ?? "").trim() : "";

    if (type === "transfer" && !transferAccountId) {
      return NextResponse.json(
        { success: false, message: "Falta la cuenta destino de la transferencia." },
        { status: 400 }
      );
    }

    const ownerMemberIdRaw = String(body.ownerMemberId ?? "").trim();
    const fuenteRaw = String(body.source ?? "manual");
    const source = FUENTES.includes(fuenteRaw as TransactionSource)
      ? (fuenteRaw as TransactionSource)
      : "manual";

    const transaction = await crearTransaction({
      householdId: contexto.householdId,
      accountId,
      transferAccountId,
      categoryId: type === "transfer" ? "" : String(body.categoryId ?? "").trim(),
      type: type as TransactionType,
      amountCents: Math.round(amount * 100),
      date,
      payee: String(body.payee ?? "").trim(),
      note: String(body.note ?? "").trim(),
      createdByMemberId: contexto.member.id,
      ownerMemberId: ownerMemberIdRaw,
      source,
      externalId: "",
    });

    return NextResponse.json({ success: true, data: transaction });
  } catch (error) {
    console.error("Error guardando transacción:", error);

    return NextResponse.json(
      { success: false, message: "No se pudo guardar la transacción." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const usuarioId = getUsuarioId(req);

    if (!usuarioId) {
      return NextResponse.json(
        { success: false, message: "No autorizado." },
        { status: 401 }
      );
    }

    const contexto = await getContextoHogar(usuarioId);

    if (!contexto) {
      return sinHogar();
    }

    const id = req.nextUrl.searchParams.get("id")?.trim();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Falta el id de la transacción." },
        { status: 400 }
      );
    }

    const eliminada = await eliminarTransaction(id, contexto.householdId);

    if (!eliminada) {
      return NextResponse.json(
        { success: false, message: "Transacción no encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Transacción eliminada correctamente.",
    });
  } catch (error) {
    console.error("Error eliminando transacción:", error);

    return NextResponse.json(
      { success: false, message: "No se pudo eliminar la transacción." },
      { status: 500 }
    );
  }
}
