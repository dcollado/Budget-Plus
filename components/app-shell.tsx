"use client";

import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { LogoutMenu } from "@/components/logout-menu";

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
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

          <nav className="flex items-center gap-6 text-sm">
            <a
              href="/"
              className="text-text-muted transition-all duration-150 hover:font-semibold hover:text-gold"
            >
              Dashboard
            </a>

            <a
              href="/facturas"
              className="text-text-muted transition-all duration-150 hover:font-semibold hover:text-gold"
            >
              Facturas
            </a>

            <a
              href="/fijos"
              className="text-text-muted transition-all duration-150 hover:font-semibold hover:text-gold"
            >
              Ítems fijos
            </a>

            <a
              href="/nueva_factura"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 font-medium text-ink transition-all duration-150 hover:font-semibold hover:opacity-90"
            >
              <Plus size={16} />
              Nueva
            </a>

            <LogoutMenu />
          </nav>
        </div>
      </header>

      {children}
    </>
  );
}
