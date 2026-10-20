// Módulos de la app que el super-admin puede encender o apagar (Admin >
// Módulos). Apagar uno lo quita del menú, de su página y de su API para todos;
// los datos no se tocan. Sin registro = encendido.

export const MODULOS = [
  { clave: "proyectos", ruta: "/proyectos" },
  { clave: "reportes", ruta: "/reporte" },
] as const;

export type ModuloClave = (typeof MODULOS)[number]["clave"];
export type Modulos = Record<ModuloClave, boolean>;

export const TODOS_ENCENDIDOS: Modulos = { proyectos: true, reportes: true };

export function esModulo(valor: unknown): valor is ModuloClave {
  return MODULOS.some((m) => m.clave === valor);
}

// El módulo al que pertenece una ruta de la app, o null si no es de ninguno.
export function moduloDeLaRuta(pathname: string): ModuloClave | null {
  return MODULOS.find((m) => pathname === m.ruta || pathname.startsWith(`${m.ruta}/`))?.clave ?? null;
}
