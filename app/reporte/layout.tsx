import PorModulo from "@/components/modulo-apagado";

export default function ReporteLayout({ children }: { children: React.ReactNode }) {
  return <PorModulo clave="reportes">{children}</PorModulo>;
}
