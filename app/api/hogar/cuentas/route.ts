import { NextRequest } from "next/server";
import { exito, fallo } from "@/lib/api";
import { requerirHogar } from "@/lib/household/contexto";
import { actualizarCuenta, crearCuenta, listCuentas } from "@/lib/household/datos";

// Cuentas destino de las transferencias ("Cuenta Chippu", "Caro"...). Son
// del hogar: cualquiera de los dos las ve y les puede asignar sus fijos.

export async function GET(req: NextRequest) {
  try {
    const r = await requerirHogar(req);
    if (!r.ok) return r.response;

    return exito(await listCuentas(r.contexto.householdId));
  } catch (error) {
    console.error("Error getting accounts:", error);
    return fallo("Could not get the accounts.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const r = await requerirHogar(req);
    if (!r.ok) return r.response;

    const body = (await req.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();

    if (!name) {
      return fallo("Account name is missing.", 400);
    }

    return exito(await crearCuenta(r.contexto.householdId, name));
  } catch (error) {
    console.error("Error creating account:", error);
    return fallo("Could not create the account.", 500);
  }
}

// Renombrar: { id, name }.
export async function PATCH(req: NextRequest) {
  try {
    const r = await requerirHogar(req);
    if (!r.ok) return r.response;

    const body = (await req.json()) as Record<string, unknown>;
    const id = String(body.id ?? "").trim();
    const name = String(body.name ?? "").trim();

    if (!id || !name) {
      return fallo("Id or name is missing.", 400);
    }

    const ok = await actualizarCuenta(id, r.contexto.householdId, { name });

    if (!ok) {
      return fallo("Account not found.", 404);
    }

    return exito({ id, name });
  } catch (error) {
    console.error("Error renaming account:", error);
    return fallo("Could not rename the account.", 500);
  }
}

// Borrar = archivar. Los fijos que apuntaban a ella quedan "sin cuenta"
// (la UI trata un cuentaId desconocido como sin asignar).
export async function DELETE(req: NextRequest) {
  try {
    const r = await requerirHogar(req);
    if (!r.ok) return r.response;

    const id = req.nextUrl.searchParams.get("id")?.trim();

    if (!id) {
      return fallo("Account id is missing.", 400);
    }

    const ok = await actualizarCuenta(id, r.contexto.householdId, { archived: true });

    if (!ok) {
      return fallo("Account not found.", 404);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting account:", error);
    return fallo("Could not delete the account.", 500);
  }
}
