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
    console.error("Error obteniendo cuentas:", error);
    return fallo("No se pudieron obtener las cuentas.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const r = await requerirHogar(req);
    if (!r.ok) return r.response;

    const body = (await req.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();

    if (!name) {
      return fallo("Falta el nombre de la cuenta.", 400);
    }

    return exito(await crearCuenta(r.contexto.householdId, name));
  } catch (error) {
    console.error("Error creando cuenta:", error);
    return fallo("No se pudo crear la cuenta.", 500);
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
      return fallo("Falta el id o el nombre.", 400);
    }

    const ok = await actualizarCuenta(id, r.contexto.householdId, { name });

    if (!ok) {
      return fallo("Cuenta no encontrada.", 404);
    }

    return exito({ id, name });
  } catch (error) {
    console.error("Error renombrando cuenta:", error);
    return fallo("No se pudo renombrar la cuenta.", 500);
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
      return fallo("Falta el id de la cuenta.", 400);
    }

    const ok = await actualizarCuenta(id, r.contexto.householdId, { archived: true });

    if (!ok) {
      return fallo("Cuenta no encontrada.", 404);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error borrando cuenta:", error);
    return fallo("No se pudo borrar la cuenta.", 500);
  }
}
