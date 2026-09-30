import { NextRequest, NextResponse } from "next/server";
import { listHouseholds } from "@/lib/household/sheets";
import { mesActual, sincronizarDosMeses } from "@/lib/household/calendario";

// Corre una vez por día (vercel.json) y sincroniza el mes actual y el
// siguiente de cada hogar. Cubre lo que no dispara un guardado: los fijos
// que se heredan a un mes nuevo, y cualquier sync que haya fallado.
//
// No usa la sesión (el proxy la deja pasar): Vercel manda
// "Authorization: Bearer <CRON_SECRET>" y eso es lo que se verifica.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, message: "No autorizado." }, { status: 401 });
  }

  const month = mesActual();
  const households = await listHouseholds();
  const errores: string[] = [];

  for (const household of households) {
    try {
      await sincronizarDosMeses(household.id, month);
    } catch (error) {
      console.error(`Error sincronizando calendario de ${household.id}:`, error);
      errores.push(household.id);
    }
  }

  return NextResponse.json({
    success: errores.length === 0,
    data: { month, households: households.length, errores },
  });
}
