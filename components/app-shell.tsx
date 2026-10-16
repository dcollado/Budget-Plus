"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  LogOut,
  Menu,
  ShieldCheck,
  Sparkles,
  User,
  UserCog,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  usePathname,
  useRouter,
} from "next/navigation";
import { NotificacionesCampana } from "@/components/notificaciones-campana";
import { useLocale, useSetLocale, useT } from "@/lib/i18n/client";
import { isLocale } from "@/lib/i18n/config";
import type { MessageKey } from "@/lib/i18n/messages";

// Daily-use items. What is set up once and rarely changes (accounts, fixed
// expenses, members, profile) lives in the user menu.
const navLinks: { href: string; label: MessageKey }[] = [
  {
    href: "/presupuesto",
    label: "nav.budget",
  },
  {
    href: "/reporte",
    label: "nav.report",
  },
];

// The profile page fires this event when the name changes, so the
// header updates without reloading.
export const EVENTO_PERFIL = "bp:perfil-actualizado";

type Perfil = {
  nombre: string;
  email: string | null;
  esSuperadmin: boolean;
  rol: "admin" | "member" | null;
  idioma?: string | null;
};

const claseLink = (activo: boolean) =>
  activo
    ? "bg-surface-raised font-medium text-gold"
    : "text-text-muted hover:bg-surface-raised hover:text-text";

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  const setLocale = useSetLocale();

  const isLoginPage = [
    "/login",
    "/invitacion",
    "/olvide",
    "/restablecer",
    "/cambios",
    "/inicio",
    "/solicitar",
    "/",
  ].includes(pathname);

  // Hamburger menu (mobile) and user menu (desktop).
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [loggingOut, setLoggingOut] = useState(false);
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  const cargarPerfil = useCallback(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const datos = (json?.data as Perfil | undefined) ?? null;
        setPerfil(datos);
        // The saved preference wins: align this browser with it.
        if (datos && isLocale(datos.idioma) && datos.idioma !== locale) {
          setLocale(datos.idioma);
          router.refresh();
        }
      })
      .catch(() => setPerfil(null));
  }, [locale, router, setLocale]);

  useEffect(() => {
    if (isLoginPage) return;

    cargarPerfil();
    window.addEventListener(EVENTO_PERFIL, cargarPerfil);

    return () => window.removeEventListener(EVENTO_PERFIL, cargarPerfil);
  }, [isLoginPage, cargarPerfil]);

  // The user menu closes on outside click or Escape.
  useEffect(() => {
    if (!userMenuOpen) return;

    function alClicAfuera(event: MouseEvent) {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }

    function alTeclear(event: KeyboardEvent) {
      if (event.key === "Escape") setUserMenuOpen(false);
    }

    document.addEventListener("mousedown", alClicAfuera);
    document.addEventListener("keydown", alTeclear);

    return () => {
      document.removeEventListener("mousedown", alClicAfuera);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [userMenuOpen]);

  const esSuperadmin = perfil?.esSuperadmin === true;
  const esAdminHogar = perfil?.rol === "admin";

  // Household data (set up once, rarely changes). The super-admin manages
  // everything, their household included, from Admin, so doesn't need "Members".
  const hogarLinks = [
    { href: "/configuracion", label: t("nav.accounts"), Icono: Wallet },
    ...(esAdminHogar && !esSuperadmin
      ? [{ href: "/miembros", label: t("nav.members"), Icono: Users }]
      : []),
  ];

  // Mine: profile and, if applicable, platform administration.
  const cuentaLinks = [
    { href: "/perfil", label: t("nav.profile"), Icono: UserCog },
    { href: "/cambios", label: t("nav.changes"), Icono: Sparkles },
    ...(esSuperadmin ? [{ href: "/admin", label: t("nav.admin"), Icono: ShieldCheck }] : []),
  ];

  const menuLinks = [...hogarLinks, ...cuentaLinks];

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

  const enCuenta = menuLinks.some((l) => linkActivo(l.href));

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
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm transition ${claseLink(
                  linkActivo(link.href)
                )}`}
              >
                {t(link.label)}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {perfil ? <NotificacionesCampana /> : null}

          {/* User menu (desktop): click to open. */}
          <div ref={userMenuRef} className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              className={`flex max-w-[14rem] items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition ${claseLink(
                enCuenta || userMenuOpen
              )}`}
            >
              <User size={16} className="shrink-0" />
              <span className="truncate capitalize">{perfil?.nombre || t("nav.myAccount")}</span>
              <ChevronDown
                size={14}
                className={`shrink-0 transition ${userMenuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {userMenuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-surface shadow-2xl shadow-black/30"
              >
                <div className="border-b border-line px-4 py-3">
                  <p className="truncate text-sm font-medium capitalize text-text">
                    {perfil?.nombre || t("nav.myAccount")}
                  </p>
                  {perfil?.email ? (
                    <p className="truncate text-xs text-text-muted">{perfil.email}</p>
                  ) : null}
                </div>

                {[hogarLinks, cuentaLinks].map((grupo, i) => (
                  <div
                    key={i}
                    className={`p-1.5 ${i > 0 ? "border-t border-line" : ""}`}
                  >
                    {grupo.map(({ href, label, Icono }) => (
                      <Link
                        key={href}
                        href={href}
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${claseLink(
                          linkActivo(href)
                        )}`}
                      >
                        <Icono size={16} className="shrink-0" />
                        {label}
                      </Link>
                    ))}
                  </div>
                ))}

                <div className="border-t border-line p-1.5">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setUserMenuOpen(false);
                      void handleLogout();
                    }}
                    disabled={loggingOut}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rust transition hover:bg-rust/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <LogOut size={16} className="shrink-0" />
                    {loggingOut ? t("userMenu.signingOut") : t("userMenu.signOut")}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() =>
              setMenuOpen((value) => !value)
            }
            aria-label={
              menuOpen
                ? t("nav.closeMenu")
                : t("nav.openMenu")
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
        </div>

        {menuOpen ? (
          <nav className="border-t border-line bg-surface px-4 py-3 md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-lg px-2 py-3 text-sm transition ${claseLink(
                    linkActivo(link.href)
                  )}`}
                >
                  {t(link.label)}
                </Link>
              ))}

              <div className="mt-2 border-t border-line pt-3">
                <p className="truncate px-2 text-sm font-medium capitalize text-text">
                  {perfil?.nombre || t("nav.myAccount")}
                </p>
                {perfil?.email ? (
                  <p className="truncate px-2 pb-1 text-xs text-text-muted">{perfil.email}</p>
                ) : null}

                {menuLinks.map(({ href, label, Icono }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-2 rounded-lg px-2 py-3 text-sm transition ${claseLink(
                      linkActivo(href)
                    )}`}
                  >
                    <Icono size={18} className="shrink-0" />
                    {label}
                  </Link>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  void handleLogout();
                }}
                disabled={loggingOut}
                className="mt-1 flex items-center gap-2 rounded-lg px-2 py-3 text-left text-sm text-rust transition hover:bg-rust/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogOut size={18} />

                {loggingOut
                  ? t("userMenu.signingOut")
                  : t("userMenu.signOut")}
              </button>
            </div>
          </nav>
        ) : null}
      </header>

      {children}
    </>
  );
}
