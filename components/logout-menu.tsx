"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut, MoreVertical, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

export function LogoutMenu() {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

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

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Abrir menú de usuario"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface-raised text-text-muted transition hover:border-sage/50 hover:text-text"
      >
        <MoreVertical size={18} />
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl shadow-black/30">
          <div className="border-b border-line px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-raised text-sage">
                <UserRound size={17} />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">
                  Facturas App
                </p>
                <p className="truncate text-xs text-text-muted">
                  Sesión activa
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-rust transition hover:bg-rust/10 disabled:opacity-60"
          >
            <LogOut size={17} />
            {loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
          </button>
        </div>
      )}
    </div>
  );
}
