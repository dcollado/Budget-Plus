import { randomBytes } from "node:crypto";
import { getSql, usaPostgres } from "@/lib/db";
import { ErrorCuenta } from "@/lib/auth/cuentas";
import { APP_TAG, calendarioDelHogar, getCalendarClient, sincronizarDosMeses } from "./calendario";
import { mesActual } from "./formato";

export type EstadoCalendario = {
  conectado: boolean;
  calendarId: string | null;
  // Con quién hay que compartir el calendario en Google.
  cuentaServicio: string | null;
  // El hogar original usa el calendario del entorno (no editable acá).
  heredado: boolean;
};

export async function estadoCalendario(householdId: string): Promise<EstadoCalendario> {
  const efectivo = await calendarioDelHogar(householdId);
  let propio: string | null = null;

  if (usaPostgres()) {
    const [fila] = await getSql()<{ calendar_id: string | null }[]>`
      select calendar_id from households where id = ${householdId}`;
    propio = fila?.calendar_id ?? null;
  }

  return {
    conectado: efectivo !== null,
    calendarId: propio ?? efectivo,
    cuentaServicio: process.env.GOOGLE_SHEETS_CLIENT_EMAIL ?? null,
    heredado: efectivo !== null && propio === null,
  };
}

function limpiarId(valor: unknown): string {
  const id = typeof valor === "string" ? valor.trim() : "";
  // Un ID de calendario es un correo (xxx@group.calendar.google.com o el
  // gmail de su dueño). Se rechaza lo demás antes de llamar a Google.
  if (!id || id.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id)) {
    throw new ErrorCuenta("That is not a valid calendar ID.");
  }
  return id;
}

// Comprueba que la cuenta de servicio puede escribir en el calendario
// creando y borrando un evento de prueba.
async function probarAcceso(calendarId: string) {
  const calendar = await getCalendarClient();
  const fecha = new Date().toISOString().slice(0, 10);
  const fin = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  try {
    const res = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: "Budget Plus — connection test",
        start: { date: fecha },
        end: { date: fin },
        transparency: "transparent",
        extendedProperties: {
          private: { bpApp: `${APP_TAG}-test`, bpTest: randomBytes(4).toString("hex") },
        },
      },
    });
    if (res.data.id) {
      await calendar.events.delete({ calendarId, eventId: res.data.id }).catch(() => {});
    }
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code === 404) {
      throw new ErrorCuenta("Calendar not found. Check the ID and share it with the service account.");
    }
    if (code === 403 || code === 401) {
      throw new ErrorCuenta(
        "No permission to edit that calendar. Share it with the service account (make changes to events)."
      );
    }
    throw error;
  }
}

// Retira de un calendario todos los eventos que Budget Plus creó para este hogar.
async function borrarEventosDelHogar(calendarId: string, householdId: string) {
  const calendar = await getCalendarClient();
  let pageToken: string | undefined;

  do {
    const res = await calendar.events.list({
      calendarId,
      privateExtendedProperty: [`bpApp=${APP_TAG}`, `bpHousehold=${householdId}`],
      maxResults: 250,
      pageToken,
    });

    for (const evento of res.data.items ?? []) {
      if (evento.id && evento.status !== "cancelled") {
        await calendar.events.delete({ calendarId, eventId: evento.id }).catch((e) => {
          if ((e as { code?: number }).code !== 410) throw e;
        });
      }
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
}

export async function conectarCalendario(householdId: string, calendarIdBruto: unknown) {
  if (!usaPostgres()) {
    throw new ErrorCuenta("Connecting a calendar requires the Postgres database.");
  }
  const calendarId = limpiarId(calendarIdBruto);

  await probarAcceso(calendarId);

  const anterior = await calendarioDelHogar(householdId);

  await getSql()`
    update households set calendar_id = ${calendarId} where id = ${householdId}`;

  // Cambio de calendario: los eventos se mueven (se quitan del anterior). Si
  // el anterior ya no es accesible no es grave: el nuevo queda sincronizado.
  if (anterior && anterior !== calendarId) {
    await borrarEventosDelHogar(anterior, householdId).catch((e) =>
      console.error("Error removing events from the previous calendar:", e)
    );
  }

  // Primer volcado: sin esperar al cron de mañana.
  await sincronizarDosMeses(householdId, mesActual());
}

// Quita el calendario del hogar. Con borrarEventos, antes retira del
// calendario todos los eventos que creó Budget Plus para este hogar.
export async function desconectarCalendario(householdId: string, borrarEventos: boolean) {
  if (!usaPostgres()) return;

  const calendarId = await calendarioDelHogar(householdId);

  if (borrarEventos && calendarId) {
    await borrarEventosDelHogar(calendarId, householdId);
  }

  // También apaga la bandera heredada: sin calendario propio, no sincroniza.
  await getSql()`
    update households
    set calendar_id = null, sincroniza_calendario = false
    where id = ${householdId}`;
}
