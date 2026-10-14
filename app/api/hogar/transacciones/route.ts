import { NextRequest } from "next/server";
import { exito, fallo } from "@/lib/api";
import { requerirHogar } from "@/lib/household/contexto";
import {
  crearTransaction,
  eliminarTransaction,
  listTransactions,
} from "@/lib/household/datos";
import { validarReferencias } from "@/lib/household/pertenencia";
import type {
  TransactionSource,
  TransactionType,
} from "@/lib/household/schema";
import { centavosDe, fechaValida, mesValido } from "@/lib/validacion";

const TIPOS: TransactionType[] = ["expense", "income", "transfer"];
const FUENTES: TransactionSource[] = ["manual", "import", "chat", "qr"];

export async function GET(req: NextRequest) {
  try {
    const r = await requerirHogar(req);
    if (!r.ok) return r.response;

    const periodo = req.nextUrl.searchParams.get("periodo")?.trim();
    const transacciones = await listTransactions(
      r.contexto.householdId,
      mesValido(periodo) ? [periodo] : undefined
    );

    transacciones.sort((a, b) => b.date.localeCompare(a.date));

    return exito(transacciones);
  } catch (error) {
    console.error("Error obteniendo transacciones:", error);
    return fallo("No se pudieron obtener las transacciones.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const r = await requerirHogar(req);
    if (!r.ok) return r.response;
    const { contexto } = r;

    const body = (await req.json()) as Record<string, unknown>;

    const type = String(body.type ?? "");
    const accountId = String(body.accountId ?? "").trim();
    const date = String(body.date ?? "").trim();
    const amountCents = centavosDe(body.amount);

    if (!TIPOS.includes(type as TransactionType)) {
      return fallo("Tipo de transacción inválido.", 400);
    }

    if (!accountId) {
      return fallo("Falta la cuenta.", 400);
    }

    if (!fechaValida(date)) {
      return fallo("Fecha inválida.", 400);
    }

    if (amountCents === null || amountCents <= 0) {
      return fallo("El monto debe ser mayor a 0.", 400);
    }

    const transferAccountId =
      type === "transfer" ? String(body.transferAccountId ?? "").trim() : "";

    if (type === "transfer" && !transferAccountId) {
      return fallo("Falta la cuenta destino de la transferencia.", 400);
    }

    const ownerMemberIdRaw = String(body.ownerMemberId ?? "").trim();
    const fuenteRaw = String(body.source ?? "manual");
    const source = FUENTES.includes(fuenteRaw as TransactionSource)
      ? (fuenteRaw as TransactionSource)
      : "manual";

    const categoryIdFinal = type === "transfer" ? "" : String(body.categoryId ?? "").trim();

    const errorRef = await validarReferencias(contexto.householdId, {
      categoryId: categoryIdFinal,
      accountIds: [accountId, transferAccountId],
      memberId: ownerMemberIdRaw,
    });

    if (errorRef) {
      return fallo(errorRef, 400);
    }

    const transaction = await crearTransaction({
      householdId: contexto.householdId,
      accountId,
      transferAccountId,
      categoryId: categoryIdFinal,
      type: type as TransactionType,
      amountCents,
      date,
      payee: String(body.payee ?? "").trim(),
      note: String(body.note ?? "").trim(),
      createdByMemberId: contexto.member.id,
      ownerMemberId: ownerMemberIdRaw,
      source,
      externalId: "",
    });

    return exito(transaction);
  } catch (error) {
    console.error("Error guardando transacción:", error);
    return fallo("No se pudo guardar la transacción.", 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const r = await requerirHogar(req);
    if (!r.ok) return r.response;

    const id = req.nextUrl.searchParams.get("id")?.trim();

    if (!id) {
      return fallo("Falta el id de la transacción.", 400);
    }

    const eliminada = await eliminarTransaction(id, r.contexto.householdId);

    if (!eliminada) {
      return fallo("Transacción no encontrada.", 404);
    }

    return Response.json({
      success: true,
      message: "Transacción eliminada correctamente.",
    });
  } catch (error) {
    console.error("Error eliminando transacción:", error);
    return fallo("No se pudo eliminar la transacción.", 500);
  }
}
