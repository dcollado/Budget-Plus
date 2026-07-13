import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import { Plus } from "lucide-react";
import "./globals.css";
import { LogoutMenu } from "@/components/logout-menu";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
});


export const metadata: Metadata = {
  title: "Gestor de Facturas",
  description: "App personal para organizar facturas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${inter.variable} ${plexMono.variable}`}
    >
      <body className="bg-ink text-text font-body">
        <header className="sticky top-0 z-50 border-b border-line bg-surface">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

            {/* LOGO */}
            <a
              href="/"
              className="font-display text-lg font-bold tracking-tight text-text transition hover:text-gold"
            >
              Budget Plus
            </a>

            {/* MENU */}
            <nav className="flex items-center gap-6 text-sm">

              <a
                href="/"
                className="text-text-muted transition-all duration-150 hover:text-gold hover:font-semibold"
              >
                Dashboard
              </a>

              <a
                href="/facturas"
                className="text-text-muted transition-all duration-150 hover:text-gold hover:font-semibold"
              >
                Facturas
              </a>

              <a
                href="/fijos"
                className="text-text-muted transition-all duration-150 hover:text-gold hover:font-semibold"
              >
                Ítems fijos
              </a>

              <a
                href="/nueva_factura"
                className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 font-medium text-ink transition-all duration-150 hover:opacity-90 hover:font-semibold"
              >
                <Plus size={16} />
                Nueva
              </a>

            </nav>
            <div className="flex items-center gap-3">
  <LogoutMenu />
</div>
          </div>
        </header>

        {children}
      </body>
    </html>
  );
}
