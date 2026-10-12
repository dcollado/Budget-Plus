import { NextRequest, NextResponse } from "next/server";
import { requerirSuperadmin } from "@/lib/auth/acceso";
import { crearHogarConAdmin, ErrorAdmin, listarHogares } from "@/lib/admin/hogares";

export async function GET(req: NextRequest) {
  try {
    const r = await requerirSuperadmin(req);
    if (!r.ok) return r.response;

    return NextResponse.json({ success: true, data: await listarHogares() });
  } catch (error) {
    console.error("Error listando hogares:", error);
    return NextResponse.json(
      { success: false, message: "No se pudieron cargar los hogares." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const r = await requerirSuperadmin(req);
    if (!r.ok) return r.response;

    const body = (await req.json()) as {
      nombreHogar?: unknown;
      adminNombre?: unknown;
      adminEmail?: unknown;
    };
    const texto = (v: unknown) => (typeof v === "string" ? v : "");

    const data = await crearHogarConAdmin({
      nombreHogar: texto(body.nombreHogar),
      adminNombre: texto(body.adminNombre),
      adminEmail: texto(body.adminEmail),
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    if (error instanceof ErrorAdmin) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }
    console.error("Error creando hogar:", error);
    return NextResponse.json(
      { success: false, message: "No se pudo crear el hogar." },
      { status: 500 }
    );
  }
}
