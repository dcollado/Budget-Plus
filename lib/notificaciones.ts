import { anunciosVigentes } from "@/lib/anuncios";
import { getSql, usaPostgres } from "@/lib/db";
import { listBudgets, listCategories, listHouseholds, listMembers, listTransactions } from "@/lib/household/datos";
import { armarVistaMes, type CategoriaDelMes } from "@/lib/household/presupuesto";

// Notificaciones dentro de la app (la campana). Cada tipo se puede apagar sin
// tocar el resto: "activa: false" = no se genera (las ya creadas siguen).
export const TIPOS_NOTIFICACION = {
  // Un pago del presupuesto vence hoy / mañana.
  pago_hoy: { activa: true },
  pago_manana: { activa: true },
  // Un gasto extra con fecha ya pasada y sin marcar como pagado. Apagado: los
  // gastos fijos aún no tienen el "pagado"; se enciende cuando lo tengan.
  pago_vencido: { activa: false },
  // Solo para super-admin: llegó una solicitud de acceso.
  solicitud_acceso: { activa: true },
  // Se lanzó una funcionalidad nueva (lib/anuncios.ts): un aviso por persona.
  novedad: { activa: true },
} as const;

export type TipoNotificacion = keyof typeof TIPOS_NOTIFICACION;

export type Notificacion = {
  id: number;
  tipo: string;
  datos: Record<string, string | number>;
  enlace: string;
  creadaEn: string;
  leida: boolean;
};

const DIAS_QUE_SE_CONSERVAN = 60;
const MAX_EN_CAMPANA = 30;

// ---------- Lectura y estado (lo que usa la campana) ----------

export async function listarNotificaciones(usuarioId: string): Promise<{
  items: Notificacion[];
  noLeidas: number;
}> {
  if (!usaPostgres()) return { items: [], noLeidas: 0 };
  const sql = getSql();

  // Los lanzamientos recientes se avisan aquí, una sola vez por persona. Si
  // falla, la campana sigue mostrando lo demás.
  try {
    await asegurarNovedades(usuarioId);
  } catch (error) {
    console.error("Could not create release notifications:", error);
  }

  const filas = await sql<
    { id: string; tipo: string; datos: Notificacion["datos"]; enlace: string; creada_en: Date; leida_en: Date | null }[]
  >`
    select id, tipo, datos, enlace, creada_en, leida_en
    from notificaciones
    where usuario_id = ${usuarioId}
    order by creada_en desc, id desc
    limit ${MAX_EN_CAMPANA}`;

  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from notificaciones
    where usuario_id = ${usuarioId} and leida_en is null`;

  return {
    items: filas.map((f) => ({
      id: Number(f.id),
      tipo: f.tipo,
      datos: f.datos,
      enlace: f.enlace,
      creadaEn: f.creada_en.toISOString(),
      leida: f.leida_en !== null,
    })),
    noLeidas: n,
  };
}

export async function marcarLeida(usuarioId: string, id: number): Promise<void> {
  await getSql()`
    update notificaciones set leida_en = now()
    where id = ${id} and usuario_id = ${usuarioId} and leida_en is null`;
}

export async function marcarTodasLeidas(usuarioId: string): Promise<void> {
  await getSql()`
    update notificaciones set leida_en = now()
    where usuario_id = ${usuarioId} and leida_en is null`;
}

// ---------- Creación ----------

async function crearNotificacion(n: {
  usuarioId: string;
  tipo: TipoNotificacion;
  clave: string;
  datos: Record<string, string | number>;
  enlace: string;
}): Promise<boolean> {
  if (!TIPOS_NOTIFICACION[n.tipo].activa) return false;
  const sql = getSql();
  const filas = await sql`
    insert into notificaciones (usuario_id, tipo, clave, datos, enlace)
    values (${n.usuarioId}, ${n.tipo}, ${n.clave}, ${sql.json(n.datos)}, ${n.enlace})
    on conflict (usuario_id, clave) do nothing
    returning id`;
  return filas.length > 0;
}

// Un aviso por cada lanzamiento vigente (lib/anuncios.ts) que esta persona
// todavía no tiene. La clave única evita repetirlo; el texto va en los dos
// idiomas y se elige al leer. Los avisos duran menos que lo que se conservan
// (DIAS_DE_ANUNCIO < DIAS_QUE_SE_CONSERVAN), así que no reaparecen.
export async function asegurarNovedades(usuarioId: string, hoy: string = fechaEnPanama()): Promise<number> {
  const vigentes = anunciosVigentes(hoy);
  if (vigentes.length === 0) return 0;

  const claves = vigentes.map((a) => `novedad:${a.id}`);
  const existentes = new Set(
    (
      await getSql()<{ clave: string }[]>`
        select clave from notificaciones
        where usuario_id = ${usuarioId} and clave = any(${claves})`
    ).map((f) => f.clave)
  );

  let creadas = 0;
  for (const anuncio of vigentes) {
    const clave = `novedad:${anuncio.id}`;
    if (existentes.has(clave)) continue;

    const nueva = await crearNotificacion({
      usuarioId,
      tipo: "novedad",
      clave,
      datos: { id: anuncio.id, en: anuncio.titulo.en, es: anuncio.titulo.es },
      enlace: anuncio.enlace,
    });
    if (nueva) creadas++;
  }

  return creadas;
}

// Llegó una solicitud de acceso: aviso para cada super-admin activo.
export async function notificarSolicitudDeAcceso(s: { id: string; nombre: string }): Promise<void> {
  const admins = await getSql()<{ id: string }[]>`
    select id from usuarios where es_superadmin and activo`;
  for (const a of admins) {
    await crearNotificacion({
      usuarioId: a.id,
      tipo: "solicitud_acceso",
      clave: `solicitud:${s.id}`,
      datos: { nombre: s.nombre },
      enlace: "/admin",
    });
  }
}

// La solicitud ya se aprobó o se rechazó: el aviso deja de tener sentido.
export async function retirarAvisoDeSolicitud(solicitudId: string): Promise<void> {
  await getSql()`delete from notificaciones where clave = ${`solicitud:${solicitudId}`}`;
}

// ---------- Recordatorios de pago ----------

export type Recordatorio = {
  tipo: "pago_hoy" | "pago_manana" | "pago_vencido";
  clave: string;
  datos: { nombre: string; montoCentavos: number; fecha: string };
};

// Fecha "YYYY-MM-DD" en Panamá (UTC-5, sin horario de verano), igual que mesActual.
export function fechaEnPanama(ahora: number = Date.now()): string {
  return new Date(ahora - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

// Qué pagos merecen aviso hoy. Función pura: recibe los ítems ya armados del
// mes (de hoy y de mañana, que pueden ser meses distintos).
export function recordatoriosDePago(
  items: CategoriaDelMes[],
  hoy: string,
  vencidoActivo: boolean = TIPOS_NOTIFICACION.pago_vencido.activa
): Recordatorio[] {
  const manana = sumarDias(hoy, 1);
  const salida: Recordatorio[] = [];

  for (const item of items) {
    if (item.category.kind !== "expense" || item.plannedAmountCents <= 0) continue;

    const quincenal = item.fechaPago2 !== "";
    // Quincenal: cada pago es la mitad del total del mes.
    const montoCentavos = quincenal ? Math.round(item.plannedAmountCents / 2) : item.plannedAmountCents;

    for (const fecha of [item.fechaPago, item.fechaPago2]) {
      if (!fecha) continue;
      const datos = { nombre: item.category.name, montoCentavos, fecha };

      if (fecha === hoy) {
        salida.push({ tipo: "pago_hoy", clave: `pago:${item.category.id}:${fecha}:hoy`, datos });
      } else if (fecha === manana) {
        salida.push({ tipo: "pago_manana", clave: `pago:${item.category.id}:${fecha}:manana`, datos });
      } else if (vencidoActivo && fecha < hoy && !item.category.fixed && !item.pagado) {
        salida.push({ tipo: "pago_vencido", clave: `pago:${item.category.id}:${fecha}:vencido`, datos });
      }
    }
  }

  return salida;
}

// Lo que corre el cron cada día: revisa el presupuesto de cada hogar y avisa a
// sus miembros. Repetirlo el mismo día no duplica nada (clave única).
export async function generarRecordatoriosDePago(ahora: number = Date.now()) {
  if (!usaPostgres()) return { households: 0, creadas: 0, errores: [] as string[] };

  const hoy = fechaEnPanama(ahora);
  const meses = [...new Set([hoy.slice(0, 7), sumarDias(hoy, 1).slice(0, 7)])];
  const errores: string[] = [];
  let creadas = 0;

  const households = await listHouseholds();

  for (const household of households) {
    try {
      const [categories, budgets, transactions, members] = await Promise.all([
        listCategories(household.id),
        listBudgets(household.id),
        listTransactions(household.id, meses),
        listMembers(household.id),
      ]);

      const items = meses.flatMap((mes) => armarVistaMes(categories, budgets, transactions, mes));
      const recordatorios = recordatoriosDePago(items, hoy);
      if (recordatorios.length === 0) continue;

      const activos = await getSql()<{ id: string }[]>`
        select id from usuarios where activo and id = any(${members.map((m) => m.userId)})`;

      for (const r of recordatorios) {
        for (const u of activos) {
          const nueva = await crearNotificacion({
            usuarioId: u.id,
            tipo: r.tipo,
            clave: r.clave,
            datos: r.datos,
            enlace: "/presupuesto",
          });
          if (nueva) creadas++;
        }
      }
    } catch (error) {
      console.error(`Error generating reminders for ${household.id}:`, error);
      errores.push(household.id);
    }
  }

  await getSql()`
    delete from notificaciones
    where creada_en < ${new Date(ahora - DIAS_QUE_SE_CONSERVAN * 24 * 60 * 60 * 1000)}`;

  return { households: households.length, creadas, errores };
}
