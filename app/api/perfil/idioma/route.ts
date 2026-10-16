import { NextRequest, NextResponse } from "next/server";
import { getUsuarioId } from "@/lib/current-user";
import { getSql, usaPostgres } from "@/lib/db";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";

// Saves the signed-in person's preferred language. The cookie is also set
// here so the choice applies on the next request without a re-login.
export async function PATCH(req: NextRequest) {
  try {
    const usuarioId = await getUsuarioId(req);
    if (!usuarioId) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const body = (await req.json()) as { locale?: unknown };
    if (!isLocale(body.locale)) {
      return NextResponse.json({ success: false, message: "Invalid language." }, { status: 400 });
    }

    // With the Google sheet backend there is no users table: cookie only.
    if (usaPostgres()) {
      await getSql()`update usuarios set idioma = ${body.locale} where id = ${usuarioId} and activo`;
    }

    const response = NextResponse.json({ success: true, data: { locale: body.locale } });
    response.cookies.set(LOCALE_COOKIE, body.locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return response;
  } catch (e) {
    console.error("Error saving language:", e);
    return NextResponse.json({ success: false, message: "Could not save the language." }, { status: 500 });
  }
}
