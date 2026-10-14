import { NextRequest, NextResponse } from "next/server";
import { ipDe } from "@/lib/auth/ip";
import { ErrorCuenta } from "@/lib/auth/cuentas";
import { crearSolicitud } from "@/lib/solicitudes";

// Pública: cualquiera puede pedir acceso. Nada se crea hasta que el
// super-admin aprueba. Responde igual exista o no la cuenta (sin revelar
// qué correos están registrados) y limita por IP.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      nombre?: unknown;
      email?: unknown;
      hogar?: unknown;
      mensaje?: unknown;
      // Trampa para bots: un humano nunca llena este campo.
      website?: unknown;
    };

    if (typeof body.website === "string" && body.website.trim() !== "") {
      return NextResponse.json({ success: true });
    }

    const { limitada } = await crearSolicitud(body, ipDe(req.headers));
    if (limitada) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Try again later." },
        { status: 429 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ErrorCuenta) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }
    console.error("Error creating access request:", error);
    return NextResponse.json(
      { success: false, message: "Could not send the request." },
      { status: 500 }
    );
  }
}
