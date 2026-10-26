// Contenedor de página compartido: mismo margen y los mismos tres anchos en
// toda la app, en vez de un max-w-* distinto por pantalla.
//
//   estrecho  formularios y texto corrido (768 px)
//   normal    una o dos columnas de contenido (1024 px)
//   ancho     tablas y paneles lado a lado (1280 px)
//   extra     como "ancho", y desde 1536 px deja sitio para una columna lateral
type Ancho = "estrecho" | "normal" | "ancho" | "extra";

// Las clases van completas para que Tailwind las genere.
const ANCHOS: Record<Ancho, string> = {
  estrecho: "max-w-3xl",
  normal: "max-w-5xl",
  ancho: "max-w-7xl",
  extra: "max-w-7xl 2xl:max-w-[96rem]",
};

export function Pagina({
  ancho = "normal",
  className = "",
  children,
}: {
  ancho?: Ancho;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <main id="contenido" tabIndex={-1} className={`outline-none mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 ${ANCHOS[ancho]} ${className}`}>
      {children}
    </main>
  );
}
