import type { MiembroHogar } from "@/lib/household/usePresupuestoMes";

export function nombreMiembro(members: MiembroHogar[], id: string): string {
  const nombre = members.find((m) => m.id === id)?.displayName ?? "";
  return nombre ? nombre.charAt(0).toUpperCase() + nombre.slice(1) : "";
}

// Color por persona: Caro rojo, el resto (David) azul. Sin dueño = neutro.
export function colorMiembro(members: MiembroHogar[], id: string) {
  if (!id) return { texto: "text-text-muted", fondo: "bg-surface-raised", borde: "border-t-line" };
  return nombreMiembro(members, id).toLowerCase().startsWith("c")
    ? { texto: "text-rose-400", fondo: "bg-rose-500/15", borde: "border-t-rose-500/70" }
    : { texto: "text-sky-400", fondo: "bg-sky-500/15", borde: "border-t-sky-500/70" };
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
