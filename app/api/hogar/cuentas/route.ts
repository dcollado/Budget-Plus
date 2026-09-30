import { NextRequest, NextResponse } from "next/server";
import { getUsuarioId } from "@/lib/current-user";
import { getContextoHogar } from "@/lib/household/contexto";
import { actualizarCuenta, crearCuenta, listCuentas } from "@/lib/household/sheets";

// Cuentas destino de las transferencias ("Cuenta Chippu", "Caro"...). Son
// del hogar: cualquiera de los dos las ve y les puede asignar sus fijos.

async function contextoOError(req: NextRequest) {
  const usuarioId = getUsuarioId(req);

  if (!usuarioId) {
    return {
      error: NextResponse.json({ success: false, message: "No autorizado." }, { status: 401 }),
    };
  }

  const contexto = await getContextoHogar(usuarioId);

  if (!contexto) {
    return {
      error: NextResponse.json(
        { success: false, message: "Tu usuario todavía no tiene un hogar configurado." },
        { status: 409 }
      ),
    };
  }

  return { contexto };
}

export async function GET(req: NextRequest) {
  try {
    const { contexto, error } = await contextoOError(req);
    if (error) return error;

    const cuentas = await listCuentas(contexto.householdId);
    return NextResponse.json({ success: true, data: cuentas });
  } catch (error) {
    console.error("Error obteniendo cuentas:", error);
    return NextResponse.json(
      { success: false, message: "No se pudieron obtener las cuentas." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { contexto, error } = await contextoOError(req);
    if (error) return error;

    const body = (await req.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Falta el nombre de la cuenta." },
        { status: 400 }
      );
    }

    const cuenta = await crearCuenta(contexto.householdId, name);
    return NextResponse.json({ success: true, data: cuenta });
  } catch (error) {
    console.error("Error creando cuenta:", error);
    return NextResponse.json(
      { success: false, message: "No se pudo crear la cuenta." },
      { status: 500 }
    );
  }
}

// Renombrar: { id, name }.
export async function PATCH(req: NextRequest) {
  try {
    const { contexto, error } = await contextoOError(req);
    if (error) return error;

    const body = (await req.json()) as Record<string, unknown>;
    const id = String(body.id ?? "").trim();
    const name = String(body.name ?? "").trim();

    if (!id || !name) {
      return NextResponse.json(
        { success: false, message: "Falta el id o el nombre." },
        { status: 400 }
      );
    }

    const ok = await actualizarCuenta(id, contexto.householdId, { name });

    if (!ok) {
      return NextResponse.json(
        { success: false, message: "Cuenta no encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: { id, name } });
  } catch (error) {
    console.error("Error renombrando cuenta:", error);
    return NextResponse.json(
      { success: false, message: "No se pudo renombrar la cuenta." },
      { status: 500 }
    );
  }
}

// Borrar = archivar. Los fijos que apuntaban a ella quedan "sin cuenta"
// (la UI trata un cuentaId desconocido como sin asignar).
export async function DELETE(req: NextRequest) {
  try {
    const { contexto, error } = await contextoOError(req);
    if (error) return error;

    const id = req.nextUrl.searchParams.get("id")?.trim();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Falta el id de la cuenta." },
        { status: 400 }
      );
    }

    const ok = await actualizarCuenta(id, contexto.householdId, { archived: true });

    if (!ok) {
      return NextResponse.json(
        { success: false, message: "Cuenta no encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error borrando cuenta:", error);
    return NextResponse.json(
      { success: false, message: "No se pudo borrar la cuenta." },
      { status: 500 }
    );
  }
}
