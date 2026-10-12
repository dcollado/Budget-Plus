import { listAccounts, listCategories, listMembers } from "./datos";

// Las rutas reciben ids del cliente. Antes de usarlos hay que comprobar que
// son de ESTE hogar (la base lo impone también, con llaves foráneas
// compuestas, pero acá se responde con un mensaje claro en vez de un 500).

export type Referencias = {
  categoryId?: string;
  accountIds?: string[];
  memberId?: string;
};

// Devuelve el mensaje de error, o null si todo es del hogar. "" = sin valor.
export async function validarReferencias(
  householdId: string,
  refs: Referencias
): Promise<string | null> {
  const [categorias, cuentas, miembros] = await Promise.all([
    refs.categoryId ? listCategories(householdId) : null,
    refs.accountIds?.some(Boolean) ? listAccounts(householdId) : null,
    refs.memberId ? listMembers(householdId) : null,
  ]);

  if (refs.categoryId && !categorias?.some((c) => c.id === refs.categoryId)) {
    return "Esa categoría no es de este hogar.";
  }

  for (const id of refs.accountIds ?? []) {
    if (id && !cuentas?.some((a) => a.id === id)) {
      return "Esa cuenta no es de este hogar.";
    }
  }

  if (refs.memberId && !miembros?.some((m) => m.id === refs.memberId)) {
    return "Ese miembro no es de este hogar.";
  }

  return null;
}
