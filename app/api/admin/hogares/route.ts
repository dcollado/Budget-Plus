import { NextRequest, NextResponse } from "next/server";
import { requerirSuperadmin } from "@/lib/auth/acceso";
import { crearHogarConAdmin, listarHogares } from "@/lib/admin/hogares";
import { ErrorCuenta } from "@/lib/auth/cuentas";

export async function GET(req: NextRequest) {
  try {
    const r = await requerirSuperadmin(req);
    if (!r.ok) return r.response;

    return NextResponse.json({
      success: true,
      data: { hogares: await listarHogares(), yo: r.acceso.usuarioId },
    });
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
      adminEmail?: unknown;
    };
    const texto = (v: unknown) => (typeof v === "string" ? v : "");

    const data = await crearHogarConAdmin({
      nombreHogar: texto(body.nombreHogar),
      adminEmail: texto(body.adminEmail),
      invitedBy: r.acceso.usuarioId,
    });

    // El enlace solo se devuelve fuera de producción, para probar sin correo.
    return NextResponse.json(
      {
        success: true,
        data: {
          householdId: data.householdId,
          enlaceDev: process.env.NODE_ENV === "production" ? undefined : data.enlace,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ErrorCuenta) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }
    console.error("Error creando hogar:", error);
    return NextResponse.json(
      { success: false, message: "No se pudo crear el hogar." },
      { status: 500 }
    );
  }
}
