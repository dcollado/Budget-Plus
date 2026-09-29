"use client";

import { useState } from "react";
import {
  LogOut,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  usePathname,
  useRouter,
} from "next/navigation";

// Pivot: por ahora la UI muestra solo /presupuesto. Los links de abajo
// quedan comentados (no borrados) para cuando retomemos el resto.
const navLinks = [
  {
    href: "/presupuesto",
    label: "Presupuesto",
  },
  {
    href: "/configuracion",
    label: "Configuración",
  },
  // { href: "/", label: "Dashboard" },
  // { href: "/movimientos", label: "Movimientos" },
  // { href: "/familia", label: "Familia" },
  // { href: "/fijos", label: "Ítems fijos" },
];

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage =
    pathname === "/login";

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  if (isLoginPage) {
    return <>{children}</>;
  }

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await fetch("/api/logout", {
        method: "POST",
      });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  function linkActivo(
    href: string
  ): boolean {
    if (href === "/") {
      return pathname === "/";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="font-display text-xl font-semibold text-text"
          >
            Budget Plus
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const activo =
                linkActivo(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-2 text-sm transition ${
                    activo
                      ? "bg-surface-raised font-medium text-gold"
                      : "text-text-muted hover:bg-surface-raised hover:text-text"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-rust transition hover:bg-rust/10 disabled:cursor-not-allowed disabled:opacity-60 md:flex"
          >
            <LogOut size={18} />

            {loggingOut
              ? "Cerrando..."
              : "Salir"}
          </button>

          <button
            type="button"
            onClick={() =>
              setMenuOpen((value) => !value)
            }
            aria-label={
              menuOpen
                ? "Cerrar menú"
                : "Abrir menú"
            }
            aria-expanded={menuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface-raised text-text-muted transition hover:border-gold/50 hover:text-text md:hidden"
          >
            {menuOpen ? (
              <X size={18} />
            ) : (
              <Menu size={18} />
            )}
          </button>
        </div>

        {menuOpen ? (
          <nav className="border-t border-line bg-surface px-4 py-3 md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col">
              {navLinks.map((link) => {
                const activo =
                  linkActivo(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() =>
                      setMenuOpen(false)
                    }
                    className={`rounded-lg px-2 py-3 text-sm transition ${
                      activo
                        ? "bg-surface-raised font-medium text-gold"
                        : "text-text-muted hover:bg-surface-raised hover:text-text"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  void handleLogout();
                }}
                disabled={loggingOut}
                className="mt-1 flex items-center gap-1.5 rounded-lg px-2 py-3 text-left text-sm text-rust transition hover:bg-rust/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogOut size={18} />

                {loggingOut
                  ? "Cerrando sesión..."
                  : "Cerrar sesión"}
              </button>
            </div>
          </nav>
        ) : null}
      </header>

      {children}
    </>
  );
}
