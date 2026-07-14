"use client";

import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
// Al reactivar el botón "Nueva factura" más abajo, agregar Plus aquí:
// import { Plus, LogOut, Menu, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/fijos", label: "Ítems fijos" },
];

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login";

  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  if (isLoginPage) {
    return <>{children}</>;
  }

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a
            href="/"
            className="font-display text-lg font-bold tracking-tight text-text transition hover:text-gold"
          >
            Budget Plus
          </a>

          {/* Menú de escritorio */}
          <nav className="hidden items-center gap-6 text-sm md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-text-muted transition-all duration-150 hover:font-semibold hover:text-gold"
              >
                {link.label}
              </a>
            ))}

            {/*
            <a
              href="/nueva_factura"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 font-medium text-ink transition-all duration-150 hover:font-semibold hover:opacity-90"
            >
              <Plus size={16} />
              Nueva
            </a>
            */}

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-1.5 text-text-muted transition-all duration-150 hover:font-semibold hover:text-rust disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut size={16} />
              {loggingOut ? "Cerrando..." : "Salir"}
            </button>
          </nav>

          {/* Botón hamburguesa — solo en móvil */}
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface-raised text-text-muted transition hover:border-gold/50 hover:text-text md:hidden"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Panel de menú móvil */}
        {menuOpen ? (
          <nav className="flex flex-col gap-1 border-t border-line bg-surface px-6 py-3 md:hidden">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-2 py-3 text-sm text-text-muted transition hover:bg-surface-raised hover:text-gold"
              >
                {link.label}
              </a>
            ))}

            {/*
            <a
              href="/nueva_factura"
              onClick={() => setMenuOpen(false)}
              className="mt-1 flex items-center justify-center gap-1.5 rounded-lg bg-gold px-4 py-3 text-sm font-medium text-ink transition hover:opacity-90"
            >
              <Plus size={16} />
              Nueva
            </a>
            */}

            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                handleLogout();
              }}
              disabled={loggingOut}
              className="mt-1 flex items-center gap-1.5 rounded-lg px-2 py-3 text-left text-sm text-rust transition hover:bg-rust/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut size={16} />
              {loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
            </button>
          </nav>
        ) : null}
      </header>

      {children}
    </>
  );
}
