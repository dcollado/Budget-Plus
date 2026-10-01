import { NextRequest, NextResponse } from "next/server";
import { getUsuarioId } from "@/lib/current-user";
import { getContextoHogar, getCuentasYCategorias } from "@/lib/household/contexto";
import { listMembers } from "@/lib/household/datos";

// Da todo lo que necesita la pantalla de transacciones para armar sus
// selects: cuentas, categorías y miembros del hogar. Una sola llamada en
// vez de tres — son datos chicos que casi no cambian.
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
      return NextResponse.json({
        success: true,
        data: { hogarConfigurado: false, accounts: [], categories: [], members: [], member: null },
      });
    }

    const [{ accounts, categories }, members] = await Promise.all([
      getCuentasYCategorias(contexto.householdId),
      listMembers(contexto.householdId),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        hogarConfigurado: true,
        accounts,
        categories,
        members,
        member: contexto.member,
      },
    });
  } catch (error) {
    console.error("Error obteniendo configuración del hogar:", error);

    return NextResponse.json(
      { success: false, message: "No se pudo cargar la configuración del hogar." },
      { status: 500 }
    );
  }
}
