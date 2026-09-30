import type { MiembroHogar } from "@/lib/household/usePresupuestoMes";

export function nombreMiembro(members: MiembroHogar[], id: string): string {
  const nombre = members.find((m) => m.id === id)?.displayName ?? "";
  return nombre ? nombre.charAt(0).toUpperCase() + nombre.slice(1) : "";
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

  return (
    <span
      title={nombre}
      aria-label={`De ${nombre}`}
      className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-surface-raised px-1 text-[10px] font-semibold text-text-muted"
    >
      {nombre.charAt(0)}
    </span>
  );
}
