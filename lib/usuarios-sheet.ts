import { getSheetsClient } from "@/lib/google-sheets";
import { getSql, usaPostgres } from "@/lib/db";

// Con DATA_BACKEND=postgres los usuarios salen de la tabla usuarios.
type FilaUsuario = { id: string; nombre: string; usuario: string; password_hash: string; activo: boolean };
const aUsuario = (r: FilaUsuario): Usuario => ({
  id: r.id,
  nombre: r.nombre,
  usuario: r.usuario,
  passwordHash: r.password_hash,
  activo: r.activo,
});

export type Usuario = {
  id: string;
  nombre: string;
  usuario: string;
  passwordHash: string;
  activo: boolean;
};

const USUARIOS_SHEET = "Usuarios";
const USUARIOS_RANGE = `${USUARIOS_SHEET}!A:E`;

function buildUsuario(row: string[]): Usuario {
  return {
    id: row[0] ?? "",
    nombre: row[1] ?? "",
    usuario: row[2] ?? "",
    passwordHash: row[3] ?? "",
    activo: (row[4] ?? "").trim().toLowerCase() !== "false",
  };
}

export async function buscarUsuarioPorNombreDeUsuario(
  usuario: string
): Promise<Usuario | null> {
  if (usaPostgres()) {
    const [fila] = await getSql()<FilaUsuario[]>`
      select * from usuarios where lower(usuario) = lower(${usuario.trim()})`;
    return fila ? aUsuario(fila) : null;
  }

  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheetId) {
    throw new Error("Falta GOOGLE_SHEET_ID en .env.local");
  }

  const sheets = await getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: USUARIOS_RANGE,
  });

  const rows = response.data.values ?? [];
  const dataRows = rows.slice(1);

  const match = dataRows.find(
    (row) => (row[2] ?? "").trim().toLowerCase() === usuario.trim().toLowerCase()
  );

  return match ? buildUsuario(match) : null;
}

export async function listarUsuarios(): Promise<Usuario[]> {
  if (usaPostgres()) {
    return (await getSql()<FilaUsuario[]>`select * from usuarios`).map(aUsuario);
  }

  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheetId) {
    throw new Error("Falta GOOGLE_SHEET_ID en .env.local");
  }

  const sheets = await getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: USUARIOS_RANGE,
  });

  const rows = response.data.values ?? [];
  return rows.slice(1).map((row) => buildUsuario(row));
}
