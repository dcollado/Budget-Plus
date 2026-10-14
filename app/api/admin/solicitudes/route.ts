import { NextRequest, NextResponse } from "next/server";
import { requerirSuperadmin } from "@/lib/auth/acceso";
import { manejarError } from "@/lib/auth/acciones-hogar";
import { listarSolicitudes } from "@/lib/solicitudes";

// Super-admin: bandeja de solicitudes de acceso.
export async function GET(req: NextRequest) {
  try {
    const r = await requerirSuperadmin(req);
    if (!r.ok) return r.response;
    return NextResponse.json({ success: true, data: await listarSolicitudes() });
  } catch (error) {
    return manejarError(error, "Could not load the requests.");
  }
}
