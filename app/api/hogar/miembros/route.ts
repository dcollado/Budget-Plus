import { NextRequest, NextResponse } from "next/server";
import { requerirAdminHogar } from "@/lib/auth/acceso";
import {
  accionDelete,
  accionPatch,
  accionPost,
  manejarError,
} from "@/lib/auth/acciones-hogar";
import { listarHogares } from "@/lib/admin/hogares";

// Admin del hogar: el hogar sale SIEMPRE de la sesión (requerirAdminHogar),
// nunca del cliente, así que no puede tocar otro hogar.

export async function GET(req: NextRequest) {
  try {
    const r = await requerirAdminHogar(req);
    if (!r.ok) return r.response;

    const [hogar] = await listarHogares(r.acceso.householdId!, {
      verSuperadmin: r.acceso.esSuperadmin,
    });
    return NextResponse.json({
      success: true,
      data: { hogar, yo: r.acceso.usuarioId },
    });
  } catch (error) {
    return manejarError(error, "No se pudieron cargar los miembros.");
  }
}

export async function POST(req: NextRequest) {
  try {
    const r = await requerirAdminHogar(req);
    if (!r.ok) return r.response;
    return await accionPost(req, r.acceso.householdId!, r.acceso);
  } catch (error) {
    return manejarError(error, "No se pudo completar la acción.");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const r = await requerirAdminHogar(req);
    if (!r.ok) return r.response;
    return await accionPatch(req, r.acceso.householdId!, r.acceso);
  } catch (error) {
    return manejarError(error, "No se pudo actualizar al miembro.");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const r = await requerirAdminHogar(req);
    if (!r.ok) return r.response;
    return await accionDelete(req, r.acceso.householdId!);
  } catch (error) {
    return manejarError(error, "No se pudo cancelar la invitación.");
  }
}
