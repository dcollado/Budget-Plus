import { buscarMemberPorUserId, listAccounts, listCategories } from "./sheets";
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
