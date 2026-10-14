// La paleta de miembros tiene 6 colores (índices 0-5). Da el primero que
// nadie del hogar usa; si ya están todos, da la vuelta.
export const COLORES_PALETA = 6;

export function primerColorLibre(usados: number[]): number {
  const set = new Set(usados);

  for (let i = 0; i < COLORES_PALETA; i += 1) {
    if (!set.has(i)) return i;
  }

  return usados.length % COLORES_PALETA;
}
