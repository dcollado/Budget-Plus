import type { MiembroHogar } from "@/lib/household/usePresupuestoMes";

export function nombreMiembro(members: MiembroHogar[], id: string): string {
  const nombre = members.find((m) => m.id === id)?.displayName ?? "";
  return nombre ? nombre.charAt(0).toUpperCase() + nombre.slice(1) : "";
}

// Per-person palette (classes must be written out in full so Tailwind
// generates them). The index is the member's color in their household:
// 0 blue, 1 red, 2 green, 3 amber, 4 violet, 5 orange.
const PALETA = [
  { texto: "text-sky-400", fondo: "bg-sky-500/15", borde: "border-t-sky-500/70" },
  { texto: "text-rose-400", fondo: "bg-rose-500/15", borde: "border-t-rose-500/70" },
  { texto: "text-emerald-400", fondo: "bg-emerald-500/15", borde: "border-t-emerald-500/70" },
  { texto: "text-amber-400", fondo: "bg-amber-500/15", borde: "border-t-amber-500/70" },
  { texto: "text-violet-400", fondo: "bg-violet-500/15", borde: "border-t-violet-500/70" },
  { texto: "text-orange-400", fondo: "bg-orange-500/15", borde: "border-t-orange-500/70" },
];

// No owner = neutral. With a saved color, its place in the palette; without
// it (Google sheet), as always: name with "c" red, the rest blue.
export function colorMiembro(members: MiembroHogar[], id: string) {
  if (!id) return { texto: "text-text-muted", fondo: "bg-surface-raised", borde: "border-t-line" };

  const color = members.find((m) => m.id === id)?.color;
  if (color !== undefined) return PALETA[color % PALETA.length];

  return nombreMiembro(members, id).toLowerCase().startsWith("c") ? PALETA[1] : PALETA[0];
}

// Initial of an expense's owner ("D", "C"). Joint (no owner) shows nothing.
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
      aria-label={`${nombre}'s`}
      className={`flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold ${color.fondo} ${color.texto}`}
    >
      {nombre.charAt(0)}
    </span>
  );
}
