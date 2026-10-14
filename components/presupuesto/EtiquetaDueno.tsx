import type { MiembroHogar } from "@/lib/household/usePresupuestoMes";

export function nombreMiembro(members: MiembroHogar[], id: string): string {
  const nombre = members.find((m) => m.id === id)?.displayName ?? "";
  return nombre ? nombre.charAt(0).toUpperCase() + nombre.slice(1) : "";
}

// Paleta por persona (las clases tienen que estar escritas completas para
// que Tailwind las genere). El índice es el color del miembro en su hogar:
// 0 azul, 1 rojo, 2 verde, 3 ámbar, 4 violeta, 5 naranja.
const PALETA = [
  { texto: "text-sky-400", fondo: "bg-sky-500/15", borde: "border-t-sky-500/70" },
  { texto: "text-rose-400", fondo: "bg-rose-500/15", borde: "border-t-rose-500/70" },
  { texto: "text-emerald-400", fondo: "bg-emerald-500/15", borde: "border-t-emerald-500/70" },
  { texto: "text-amber-400", fondo: "bg-amber-500/15", borde: "border-t-amber-500/70" },
  { texto: "text-violet-400", fondo: "bg-violet-500/15", borde: "border-t-violet-500/70" },
  { texto: "text-orange-400", fondo: "bg-orange-500/15", borde: "border-t-orange-500/70" },
];

// Sin dueño = neutro. Con color guardado, su lugar en la paleta; sin él (hoja
// de Google), como siempre: nombre con "c" rojo, el resto azul.
export function colorMiembro(members: MiembroHogar[], id: string) {
  if (!id) return { texto: "text-text-muted", fondo: "bg-surface-raised", borde: "border-t-line" };

  const color = members.find((m) => m.id === id)?.color;
  if (color !== undefined) return PALETA[color % PALETA.length];

  return nombreMiembro(members, id).toLowerCase().startsWith("c") ? PALETA[1] : PALETA[0];
}

// Inicial del dueño de un gasto ("D", "C"). Conjunto (sin dueño) no muestra nada.
export default function EtiquetaDueno({
  ownerMemberId,
  members,
}: {
  ownerMemberId: string;
  members: MiembroHogar[];
}) {
  const nombre = ownerMemberId ? nombreMiembro(members, ownerMemberId) : "";
  if (!nombre) return null;
  const color = colorMiembro(members, ownerMemberId);

  return (
    <span
      title={nombre}
      aria-label={`De ${nombre}`}
      className={`flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold ${color.fondo} ${color.texto}`}
    >
      {nombre.charAt(0)}
    </span>
  );
}
