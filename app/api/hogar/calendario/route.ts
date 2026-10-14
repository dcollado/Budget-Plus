import { NextRequest } from "next/server";
import { requerirAdminHogar } from "@/lib/auth/acceso";
import { calendarioDelete, calendarioGet, calendarioPut } from "@/lib/auth/acciones-calendario";

// Admin del hogar: el hogar sale SIEMPRE de la sesión, nunca del cliente.
export async function GET(req: NextRequest) {
  const r = await requerirAdminHogar(req);
  if (!r.ok) return r.response;
  return calendarioGet(r.acceso.householdId!);
}

export async function PUT(req: NextRequest) {
  const r = await requerirAdminHogar(req);
  if (!r.ok) return r.response;
  return calendarioPut(req, r.acceso.householdId!);
}

export async function DELETE(req: NextRequest) {
  const r = await requerirAdminHogar(req);
  if (!r.ok) return r.response;
  return calendarioDelete(req, r.acceso.householdId!);
}
