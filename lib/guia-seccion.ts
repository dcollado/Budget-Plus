// A qué sección de la guía (/guia#<id>) lleva el ícono "?" según la pantalla.
// Va aparte del texto de la guía (lib/guia.ts) para que el menú, que se carga
// en toda la app, no arrastre todo ese contenido.
export function seccionDeLaGuia(pathname: string): string {
  if (pathname.startsWith("/presupuesto")) return "presupuesto";
  if (pathname.startsWith("/proyectos")) return "proyectos";
  if (pathname.startsWith("/reporte")) return "reportes";
  if (pathname.startsWith("/configuracion")) return "fijos";
  if (pathname.startsWith("/perfil")) return "perfil";
  if (pathname.startsWith("/miembros")) return "personas";
  return "empezar";
}
