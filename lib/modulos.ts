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

// Lo que ve el super-admin: el valor por defecto de todos los hogares y, por hogar,
// sus excepciones (solo los módulos que tienen una).
export type EstadoDeModulos = {
  porDefecto: Modulos;
  hogares: { id: string; nombre: string; excepciones: Partial<Modulos> }[];
};

// Lo que ve un hogar: su excepción si la tiene, y si no, el valor por defecto.
export function combinarModulos(porDefecto: Modulos, excepciones: Partial<Modulos> = {}): Modulos {
  const salida = { ...porDefecto };
  for (const m of MODULOS) {
    const valor = excepciones[m.clave];
    if (typeof valor === "boolean") salida[m.clave] = valor;
  }
  return salida;
}

export function esModulo(valor: unknown): valor is ModuloClave {
  return MODULOS.some((m) => m.clave === valor);
}

// El módulo al que pertenece una ruta de la app, o null si no es de ninguno.
export function moduloDeLaRuta(pathname: string): ModuloClave | null {
  return MODULOS.find((m) => pathname === m.ruta || pathname.startsWith(`${m.ruta}/`))?.clave ?? null;
}
