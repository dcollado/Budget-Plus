import { NextResponse } from "next/server";

// Forma única de respuesta de las rutas: { success, message } en error y
// { success: true, data } en éxito.
export function fallo(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

export function exito<T>(data: T) {
  return NextResponse.json({ success: true, data });
}
