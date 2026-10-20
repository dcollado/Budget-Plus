import { randomUUID } from "node:crypto";
import { getSql, usaPostgres } from "@/lib/db";
import { ErrorCuenta } from "@/lib/auth/cuentas";
import { registrarEvento } from "@/lib/auth/eventos";
import { anunciosVigentes, validarAnuncio, type Anuncio, type EntradaAnuncio } from "@/lib/anuncios";

type Fila = {
  id: string;
  fecha_inicio: string;
  dias: number;
  activo: boolean;
  titulo_en: string;
  titulo_es: string;
  texto_en: string;
  texto_es: string;
  enlace: string;
};

const aAnuncio = (f: Fila): Anuncio => ({
  id: f.id,
  fecha: f.fecha_inicio,
  dias: f.dias,
  activo: f.activo,
  titulo: { en: f.titulo_en, es: f.titulo_es },
  texto: { en: f.texto_en, es: f.texto_es },
  enlace: f.enlace,
});

function exigirPostgres() {
  if (!usaPostgres()) throw new ErrorCuenta("Release notices require the Postgres database.");
}

function validar(entrada: unknown): EntradaAnuncio {
  try {
    return validarAnuncio(entrada);
  } catch (e) {
    throw new ErrorCuenta(e instanceof Error ? e.message : "Invalid request.");
  }
}

export async function listarAnuncios(): Promise<Anuncio[]> {
  if (!usaPostgres()) return [];
  // fecha_inicio sale como texto YYYY-MM-DD (no como Date) para no depender de la zona horaria.
  const filas = await getSql()<Fila[]>`
    select id, to_char(fecha_inicio, 'YYYY-MM-DD') as fecha_inicio, dias, activo,
           titulo_en, titulo_es, texto_en, texto_es, enlace
    from anuncios
    order by anuncios.fecha_inicio desc, creado_en desc`;
  return filas.map(aAnuncio);
}

export async function listarAnunciosVigentes(hoy: string): Promise<Anuncio[]> {
  return anunciosVigentes(await listarAnuncios(), hoy);
}

export async function crearAnuncio(actorUserId: string, entrada: unknown): Promise<Anuncio> {
  exigirPostgres();
  const v = validar(entrada);
  const id = `novedad-${randomUUID().slice(0, 8)}`;

  await getSql()`
    insert into anuncios (id, fecha_inicio, dias, activo, titulo_en, titulo_es, texto_en, texto_es, enlace)
    values (${id}, ${v.fecha}, ${v.dias}, ${v.activo}, ${v.titulo.en}, ${v.titulo.es},
            ${v.texto.en}, ${v.texto.es}, ${v.enlace})`;

  await registrarEvento({ accion: "crear_novedad", actorUserId, detalle: v.titulo.es });
  return { id, fecha: v.fecha, dias: v.dias, activo: v.activo, titulo: v.titulo, texto: v.texto, enlace: v.enlace };
}

export async function editarAnuncio(actorUserId: string, id: string, entrada: unknown): Promise<void> {
  exigirPostgres();
  const v = validar(entrada);

  const filas = await getSql()`
    update anuncios set
      fecha_inicio = ${v.fecha}, dias = ${v.dias}, activo = ${v.activo},
      titulo_en = ${v.titulo.en}, titulo_es = ${v.titulo.es},
      texto_en = ${v.texto.en}, texto_es = ${v.texto.es}, enlace = ${v.enlace}
    where id = ${id}
    returning id`;
  if (filas.length === 0) throw new ErrorCuenta("Notice not found.");

  await registrarEvento({ accion: "editar_novedad", actorUserId, detalle: v.titulo.es });
}

export async function eliminarAnuncio(actorUserId: string, id: string): Promise<void> {
  exigirPostgres();
  const filas = await getSql()<{ titulo_es: string }[]>`
    delete from anuncios where id = ${id} returning titulo_es`;
  if (filas.length === 0) throw new ErrorCuenta("Notice not found.");

  await registrarEvento({ accion: "eliminar_novedad", actorUserId, detalle: filas[0].titulo_es });
}
