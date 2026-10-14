// Punto único de acceso a los datos del hogar. Según DATA_BACKEND usa
// Postgres (Supabase) o la hoja de Google; las dos implementaciones tienen
// exactamente las mismas funciones.

import { usaPostgres } from "@/lib/db";
import * as hoja from "./backend-sheets";
import * as pg from "./backend-postgres";

// Solo las funciones (backend-sheets también exporta nombres de rangos).
type Backend = {
  [K in keyof typeof hoja as (typeof hoja)[K] extends (...a: never[]) => unknown ? K : never]: (typeof hoja)[K];
};
// Si a Postgres le falta alguna función, esto no compila.
const postgres: Backend = pg;

function elegir<K extends keyof Backend>(nombre: K): Backend[K] {
  return ((...args: unknown[]) => {
    const fn = (usaPostgres() ? postgres : hoja)[nombre] as (...a: unknown[]) => unknown;
    return fn(...args);
  }) as Backend[K];
}

export const listHouseholds = elegir("listHouseholds");
export const crearHousehold = elegir("crearHousehold");
export const listMembers = elegir("listMembers");
export const buscarMemberPorUserId = elegir("buscarMemberPorUserId");
export const crearMember = elegir("crearMember");
export const listAccounts = elegir("listAccounts");
export const crearAccount = elegir("crearAccount");
export const listCategories = elegir("listCategories");
export const crearCategory = elegir("crearCategory");
export const archivarCategory = elegir("archivarCategory");
export const actualizarCategoria = elegir("actualizarCategoria");
export const listCuentas = elegir("listCuentas");
export const crearCuenta = elegir("crearCuenta");
export const actualizarCuenta = elegir("actualizarCuenta");
export const listBudgets = elegir("listBudgets");
export const upsertBudget = elegir("upsertBudget");
export const listTransactions = elegir("listTransactions");
export const crearTransaction = elegir("crearTransaction");
export const eliminarTransaction = elegir("eliminarTransaction");
