import { NextResponse } from "next/server";
import { solicitarReset } from "@/lib/auth/cuentas";

// Siempre responde igual, exista o no el correo.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: unknown };
    await solicitarReset(body.email);
  } catch (error) {
    console.error("Error requesting password reset:", error);
  }

  return NextResponse.json({ success: true });
}
