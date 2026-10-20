import { Pagina } from "@/components/pagina";
import { getT } from "@/lib/i18n/server";
import { moduloActivo } from "@/lib/modulos-datos";
import type { ModuloClave } from "@/lib/modulos";

// Envuelve la página de un módulo: si el super-admin lo apagó, muestra un aviso
// en vez de la página. Se vuelve a revisar en cada visita.
export default async function PorModulo({
  clave,
  children,
}: {
  clave: ModuloClave;
  children: React.ReactNode;
}) {
  if (await moduloActivo(clave)) return <>{children}</>;

  const { t } = await getT();

  return (
    <Pagina className="space-y-3">
      <h1 className="font-display text-2xl font-semibold text-text">{t("modules.unavailableTitle")}</h1>
      <p className="text-sm text-text-muted">{t("modules.unavailableText")}</p>
    </Pagina>
  );
}
