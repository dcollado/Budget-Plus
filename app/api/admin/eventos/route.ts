import { NextRequest, NextResponse } from "next/server";
import { requerirSuperadmin } from "@/lib/auth/acceso";
import { listarEventos } from "@/lib/auth/eventos";

// Registro de actividad administrativa: solo el super-admin.
export async function GET(req: NextRequest) {
  try {
    const r = await requerirSuperadmin(req);
    if (!r.ok) return r.response;

    return NextResponse.json({ success: true, data: await listarEventos(100) });
  } catch (error) {
    console.error("Error leyendo eventos:", error);
    return NextResponse.json(
      { success: false, message: "No se pudo cargar la actividad." },
      { status: 500 }
    );
  }
}
