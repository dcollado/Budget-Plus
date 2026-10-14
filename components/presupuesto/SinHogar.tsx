import { sectionCardClass } from "@/lib/ui";

// Cuenta válida pero sin hogar asignado todavía (ej. alguien a quien se le
// quitó el hogar, o una cuenta recién creada a mano).
export default function SinHogar() {
  return (
    <div className={sectionCardClass}>
      <p className="text-sm font-medium text-text">Tu cuenta todavía no tiene un hogar.</p>
      <p className="mt-1 text-sm text-text-muted">
        Pídele a quien administra tu hogar que te invite con tu correo, o escribe al
        administrador de Budget Plus.
      </p>
    </div>
  );
}
