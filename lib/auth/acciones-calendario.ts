import { NextRequest, NextResponse } from "next/server";
import { manejarError } from "@/lib/auth/acciones-hogar";
import {
  conectarCalendario,
  desconectarCalendario,
  estadoCalendario,
} from "@/lib/household/calendario-config";

// Acciones de calendario sobre UN hogar. Las comparten la ruta del admin del
// hogar (el hogar sale de la sesión) y la del super-admin (id en la URL):
// quien llama ya verificó el permiso y decide qué householdId pasar.

export async function calendarioGet(householdId: string) {
  try {
    return NextResponse.json({ success: true, data: await estadoCalendario(householdId) });
  } catch (error) {
    return manejarError(error, "Could not load the calendar.");
  }
}

export async function calendarioPut(req: NextRequest, householdId: string) {
  try {
    const body = (await req.json()) as { calendarId?: unknown };
    await conectarCalendario(householdId, body.calendarId);
    return NextResponse.json({ success: true, data: await estadoCalendario(householdId) });
  } catch (error) {
    return manejarError(error, "Could not connect the calendar.");
  }
}

export async function calendarioDelete(req: NextRequest, householdId: string) {
  try {
    const borrar = new URL(req.url).searchParams.get("borrarEventos") === "1";
    await desconectarCalendario(householdId, borrar);
    return NextResponse.json({ success: true, data: await estadoCalendario(householdId) });
  } catch (error) {
    return manejarError(error, "Could not disconnect the calendar.");
  }
}
