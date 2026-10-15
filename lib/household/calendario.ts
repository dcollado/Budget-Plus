import { createHash } from "crypto";
import type { calendar_v3 } from "googleapis";
import { armarVistaMes, type CategoriaDelMes } from "./presupuesto";
import { listBudgets, listCategories, listTransactions } from "./datos";
import { getSql, usaPostgres } from "@/lib/db";
import { formatearCentavos, formatearMes, mesSiguiente } from "./formato";

// Sincroniza los pagos del presupuesto a un Google Calendar compartido
// ("Budget Plus - Pagos"): un evento de día completo por cada ítem con
// fecha de pago y monto > 0. Los avisos (mismo día / 3 días antes) no se
// ponen acá — cada uno los configura como notificaciones por defecto del
// calendario, que es lo que funciona para calendarios compartidos.
//
// Cada hogar usa su propio calendario (households.calendar_id, que su admin
// conecta desde Perfil). El hogar original, sin calendar_id, sigue con
// GOOGLE_CALENDAR_ID. Sin calendario = no hace nada (ej. en local, para no
// llenar el calendario real con datos de la hoja de pruebas).

type Calendar = calendar_v3.Calendar;
type Evento = calendar_v3.Schema$Event;

export const APP_TAG = "budgetplus";

// El calendario donde escribe este hogar, o null si no sincroniza.
export async function calendarioDelHogar(householdId: string): Promise<string | null> {
  const delEntorno = process.env.GOOGLE_CALENDAR_ID?.trim() || null;

  // Con la hoja no hay hogares ajenos: siempre el del entorno.
  if (!usaPostgres()) return delEntorno;

  const [fila] = await getSql()<
    { calendar_id: string | null; sincroniza_calendario: boolean; archivado_en: Date | null }[]
  >`
    select calendar_id, sincroniza_calendario, archivado_en
    from households where id = ${householdId}`;

  if (!fila || fila.archivado_en !== null) return null;
  if (fila.calendar_id) return fila.calendar_id;
  return fila.sincroniza_calendario ? delEntorno : null;
}

// googleapis pesa mucho: se carga solo cuando de verdad hay que sincronizar.
export async function getCalendarClient(): Promise<Calendar> {
  const { google } = await import("googleapis");
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("Google credentials are missing from the environment variables.");
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  return google.calendar({ version: "v3", auth });
}

// Id estable por (hogar, categoría, mes): así el mismo pago siempre cae en
// el mismo evento y se actualiza en vez de duplicarse. Google exige ids
// en base32hex (0-9, a-v); un hash hex cumple.
function eventoId(
  householdId: string,
  categoryId: string,
  month: string,
  pago: 1 | 2 = 1
): string {
  // El primer pago conserva el id de siempre; el segundo lleva un sufijo.
  const hash = createHash("sha1")
    .update(pago === 1 ? `${householdId}|${categoryId}|${month}` : `${householdId}|${categoryId}|${month}|2`)
    .digest("hex");
  return `bp${hash}`;
}

function diaSiguiente(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const d = new Date(Date.UTC(anio, mes - 1, dia + 1));
  return d.toISOString().slice(0, 10);
}

function armarEvento(
  item: CategoriaDelMes,
  householdId: string,
  month: string,
  pago: 1 | 2 = 1
): Evento {
  const esIngreso = item.category.kind === "income";
  const quincenal = item.fechaPago2 !== "";
  // Quincenal: cada pago es la mitad del total del mes.
  const monto = formatearCentavos(
    quincenal ? Math.round(item.plannedAmountCents / 2) : item.plannedAmountCents
  );
  const fecha = pago === 1 ? item.fechaPago : item.fechaPago2;

  return {
    id: eventoId(householdId, item.category.id, month, pago),
    summary: esIngreso
      ? `💰 ${item.category.name} — +${monto}`
      : `💸 ${item.category.name} — ${monto}`,
    description: `Budget Plus · ${item.category.fixed ? "Fixed" : "Variable"} · ${formatearMes(month)}`,
    start: { date: fecha },
    end: { date: diaSiguiente(fecha) },
    // No bloquea el calendario (no aparece como "ocupado").
    transparency: "transparent",
    status: "confirmed",
    extendedProperties: {
      private: {
        bpApp: APP_TAG,
        bpHousehold: householdId,
        bpMonth: month,
        bpCategory: item.category.id,
      },
    },
  };
}

async function listarEventosDelMes(
  calendar: Calendar,
  calendarId: string,
  householdId: string,
  month: string
): Promise<Evento[]> {
  const eventos: Evento[] = [];
  let pageToken: string | undefined;

  do {
    const res = await calendar.events.list({
      calendarId,
      privateExtendedProperty: [
        `bpApp=${APP_TAG}`,
        `bpHousehold=${householdId}`,
        `bpMonth=${month}`,
      ],
      maxResults: 250,
      pageToken,
    });

    eventos.push(...(res.data.items ?? []));
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return eventos;
}

async function guardarEvento(calendar: Calendar, calendarId: string, evento: Evento) {
  try {
    // update también "revive" un evento que se había borrado antes con el
    // mismo id (Google lo guarda como cancelado y no deja reinsertarlo).
    await calendar.events.update({
      calendarId,
      eventId: evento.id!,
      requestBody: evento,
    });
  } catch (error) {
    if ((error as { code?: number }).code !== 404) throw error;
  }

  try {
    await calendar.events.insert({ calendarId, requestBody: evento });
  } catch (error) {
    // 409 = otra sincronización en paralelo (varios guardados seguidos) lo
    // creó entre el update y el insert. Ya existe: se actualiza.
    if ((error as { code?: number }).code !== 409) throw error;
    await calendar.events.update({ calendarId, eventId: evento.id!, requestBody: evento });
  }
}

type DatosHogar = {
  categories: Awaited<ReturnType<typeof listCategories>>;
  budgets: Awaited<ReturnType<typeof listBudgets>>;
  transactions: Awaited<ReturnType<typeof listTransactions>>;
};

// Lecturas de la hoja que necesita una sincronización. Se hacen una sola
// vez aunque se sincronicen varios meses: Google Sheets limita a 60
// lecturas por minuto, y cada guardado ya dispara una sincronización.
async function leerDatosHogar(householdId: string, meses: string[]): Promise<DatosHogar> {
  const [categories, budgets, transactions] = await Promise.all([
    listCategories(householdId),
    listBudgets(householdId),
    listTransactions(householdId, meses),
  ]);
  return { categories, budgets, transactions };
}

// Deja el calendario de un mes igual a lo que hay en el presupuesto:
// crea/actualiza los pagos con fecha y monto, y borra los que ya no están.
// Solo toca eventos que creó esta app (marcados con bpApp).
async function sincronizarMes(
  calendar: Calendar,
  calendarId: string,
  householdId: string,
  month: string,
  { categories, budgets, transactions }: DatosHogar
) {
  const existentes = await listarEventosDelMes(calendar, calendarId, householdId, month);

  const deseados = armarVistaMes(categories, budgets, transactions, month)
    .filter((i) => i.fechaPago && i.plannedAmountCents > 0)
    .flatMap((i) =>
      i.fechaPago2
        ? [armarEvento(i, householdId, month, 1), armarEvento(i, householdId, month, 2)]
        : [armarEvento(i, householdId, month)]
    );

  const existentesPorId = new Map(existentes.map((e) => [e.id, e]));
  const idsDeseados = new Set(deseados.map((e) => e.id));

  // Un evento que falla no frena al resto; se reportan todos al final.
  const errores: unknown[] = [];

  for (const evento of deseados) {
    const actual = existentesPorId.get(evento.id);
    const igual =
      actual &&
      actual.status !== "cancelled" &&
      actual.summary === evento.summary &&
      actual.start?.date === evento.start?.date &&
      actual.description === evento.description;

    if (!igual) {
      await guardarEvento(calendar, calendarId, evento).catch((e) => errores.push(e));
    }
  }

  for (const evento of existentes) {
    if (evento.id && !idsDeseados.has(evento.id) && evento.status !== "cancelled") {
      await calendar.events
        .delete({ calendarId, eventId: evento.id })
        .catch((e) => {
          // 410 = ya lo borró otra sincronización en paralelo.
          if ((e as { code?: number }).code !== 410) errores.push(e);
        });
    }
  }

  if (errores.length > 0) {
    throw new AggregateError(errores, `${errores.length} events failed for ${month}`);
  }
}

// El mes dado y el siguiente — lo que muestra Presupuesto, y lo mínimo
// para que un cambio en una fija (que se hereda) llegue al mes que viene.
export async function sincronizarDosMeses(householdId: string, month: string) {
  const calendarId = await calendarioDelHogar(householdId);
  if (!calendarId) return;

  const calendar = await getCalendarClient();
  const datos = await leerDatosHogar(householdId, [month, mesSiguiente(month)]);

  await sincronizarMes(calendar, calendarId, householdId, month, datos);
  await sincronizarMes(calendar, calendarId, householdId, mesSiguiente(month), datos);
}

// Al borrar (archivar) una categoría, saca todos sus eventos, de cualquier mes.
export async function borrarEventosDeCategoria(householdId: string, categoryId: string) {
  const calendarId = await calendarioDelHogar(householdId);
  if (!calendarId) return;

  const calendar = await getCalendarClient();
  const res = await calendar.events.list({
    calendarId,
    privateExtendedProperty: [
      `bpApp=${APP_TAG}`,
      `bpHousehold=${householdId}`,
      `bpCategory=${categoryId}`,
    ],
    maxResults: 250,
  });

  for (const evento of res.data.items ?? []) {
    if (evento.id && evento.status !== "cancelled") {
      await calendar.events.delete({ calendarId, eventId: evento.id }).catch((e) => {
        if ((e as { code?: number }).code !== 410) throw e;
      });
    }
  }
}

// Para usar dentro de after(): nunca tira, solo loguea. Un fallo del
// calendario no tiene que romper el guardado del presupuesto.
export async function sincronizarSinFallar(tarea: () => Promise<void>) {
  try {
    await tarea();
  } catch (error) {
    console.error("Error syncing Google Calendar:", error);
  }
}
