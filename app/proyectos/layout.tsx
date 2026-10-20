import PorModulo from "@/components/modulo-apagado";

export default function ProyectosLayout({ children }: { children: React.ReactNode }) {
  return <PorModulo clave="proyectos">{children}</PorModulo>;
}
