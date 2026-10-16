import { NextRequest, NextResponse } from "next/server";
import { generarRecordatoriosDePago } from "@/lib/notificaciones";

// Corre una vez por día (vercel.json): crea los avisos de pagos que vencen
// hoy o mañana. No usa la sesión (el proxy la deja pasar): Vercel manda
// "Authorization: Bearer <CRON_SECRET>" y eso es lo que se verifica.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  const resultado = await generarRecordatoriosDePago();

  return NextResponse.json({ success: resultado.errores.length === 0, data: resultado });
}
