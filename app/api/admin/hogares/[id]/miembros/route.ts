import { NextRequest } from "next/server";
import { requerirSuperadmin } from "@/lib/auth/acceso";
import {
  accionDelete,
  accionPatch,
  accionPost,
  manejarError,
} from "@/lib/auth/acciones-hogar";

type Contexto = { params: Promise<{ id: string }> };

// Super-admin: cualquier hogar (el id viene de la URL; es legítimo porque
// requerirSuperadmin ya verificó quién llama).
export async function POST(req: NextRequest, { params }: Contexto) {
  try {
    const r = await requerirSuperadmin(req);
    if (!r.ok) return r.response;
    return await accionPost(req, (await params).id, r.acceso);
  } catch (error) {
    return manejarError(error, "No se pudo completar la acción.");
  }
}

export async function PATCH(req: NextRequest, { params }: Contexto) {
  try {
    const r = await requerirSuperadmin(req);
    if (!r.ok) return r.response;
    return await accionPatch(req, (await params).id, r.acceso);
  } catch (error) {
    return manejarError(error, "No se pudo actualizar al miembro.");
  }
}

export async function DELETE(req: NextRequest, { params }: Contexto) {
  try {
    const r = await requerirSuperadmin(req);
    if (!r.ok) return r.response;
    return await accionDelete(req, (await params).id);
  } catch (error) {
    return manejarError(error, "No se pudo cancelar la invitación.");
  }
}
