import type { NextRequest, NextResponse } from "next/server";
import { fallo } from "@/lib/api";
import { getUsuarioId } from "@/lib/current-user";
import { buscarMemberPorUserId, listAccounts, listCategories } from "./datos";
import type { Account, Category, Member } from "./schema";

export type ContextoHogar = {
  member: Member;
  householdId: string;
};

// Resuelve el member (y por lo tanto el household) del usuario logueado.
// Si el usuario todavía no tiene member (no se corrió el seed), devuelve
// null — las rutas deben tratarlo como "sin hogar configurado", no como
// no autorizado.
export async function getContextoHogar(
  usuarioId: string
): Promise<ContextoHogar | null> {
  const member = await buscarMemberPorUserId(usuarioId);

  if (!member) {
    return null;
  }

  return { member, householdId: member.householdId };
}

export async function getCuentasYCategorias(
  householdId: string
): Promise<{ accounts: Account[]; categories: Category[] }> {
  const [accounts, categories] = await Promise.all([
    listAccounts(householdId),
    listCategories(householdId),
  ]);

  return { accounts, categories };
}

export type ResultadoHogar =
  | { ok: true; contexto: ContextoHogar }
  | { ok: false; response: NextResponse };

// Punto único de entrada de las rutas de datos del hogar: identidad que
// dejó el proxy + hogar del usuario. Devuelve el contexto o la respuesta de
// error lista para retornar (401 sin sesión, 409 sin hogar).
export async function requerirHogar(req: NextRequest): Promise<ResultadoHogar> {
  const usuarioId = getUsuarioId(req);
  if (!usuarioId) return { ok: false, response: fallo("Unauthorized.", 401) };

  const contexto = await getContextoHogar(usuarioId);

  if (!contexto) {
    return {
      ok: false,
      response: fallo(
        "Your account does not have a household yet. Ask whoever manages your household to invite you.",
        409
      ),
    };
  }

  return { ok: true, contexto };
}
