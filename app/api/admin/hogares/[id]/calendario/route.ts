import { NextRequest } from "next/server";
import { requerirSuperadmin } from "@/lib/auth/acceso";
import { calendarioDelete, calendarioGet, calendarioPut } from "@/lib/auth/acciones-calendario";

type Contexto = { params: Promise<{ id: string }> };

// Super-admin: cualquier hogar (el id viene de la URL; es legítimo porque
// requerirSuperadmin ya verificó quién llama).
export async function GET(req: NextRequest, { params }: Contexto) {
  const r = await requerirSuperadmin(req);
  if (!r.ok) return r.response;
  return calendarioGet((await params).id);
}

export async function PUT(req: NextRequest, { params }: Contexto) {
  const r = await requerirSuperadmin(req);
  if (!r.ok) return r.response;
  return calendarioPut(req, (await params).id);
}

export async function DELETE(req: NextRequest, { params }: Contexto) {
  const r = await requerirSuperadmin(req);
  if (!r.ok) return r.response;
  return calendarioDelete(req, (await params).id);
}
