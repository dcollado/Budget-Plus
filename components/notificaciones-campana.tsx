"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/messages";
import { formatearCentavos, formatearFechaCorta } from "@/lib/household/formato";
import type { Notificacion } from "@/lib/notificaciones";

const CADA_MS = 60_000;

// Avisa a la campana que algo cambió (p. ej. se cerró un aviso de lanzamiento).
export const EVENTO_NOTIFICACIONES = "bp:notificaciones";

// La campana del encabezado: avisos de pagos y, para el super-admin, de
// solicitudes. Se actualiza sola cada minuto y al abrirla.
export function NotificacionesCampana() {
  const t = useT();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  const [abierta, setAbierta] = useState(false);
  const [items, setItems] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);

  const cargar = useCallback(() => {
    fetch("/api/notificaciones", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json?.data) return;
        setItems(json.data.items as Notificacion[]);
        setNoLeidas(json.data.noLeidas as number);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    cargar();
    const timer = setInterval(cargar, CADA_MS);
    // Otras partes de la app (el aviso de lanzamiento) piden refrescar al marcar algo leído.
    window.addEventListener(EVENTO_NOTIFICACIONES, cargar);
    return () => {
      clearInterval(timer);
      window.removeEventListener(EVENTO_NOTIFICACIONES, cargar);
    };
  }, [cargar]);

  useEffect(() => {
    if (!abierta) return;

    function alClicAfuera(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setAbierta(false);
    }
    function alTeclear(event: KeyboardEvent) {
      if (event.key === "Escape") setAbierta(false);
    }

    document.addEventListener("mousedown", alClicAfuera);
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("mousedown", alClicAfuera);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierta]);

  async function marcar(cuerpo: { id: number } | { todas: true }) {
    await fetch("/api/notificaciones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    }).catch(() => {});
    cargar();
  }

  function abrir(n: Notificacion) {
    setAbierta(false);
    if (!n.leida) void marcar({ id: n.id });
    if (n.enlace) router.push(n.enlace);
  }

  // El texto se arma al leer, en el idioma de quien mira.
  function texto(n: Notificacion): { titulo: string; detalle: string } {
    const nombre = String(n.datos.nombre ?? "");
    const fecha = typeof n.datos.fecha === "string" ? formatearFechaCorta(n.datos.fecha, t.locale) : "";
    const monto = typeof n.datos.montoCentavos === "number" ? formatearCentavos(n.datos.montoCentavos) : "";

    const clave: Record<string, MessageKey> = {
      pago_hoy: "notif.payToday",
      pago_manana: "notif.payTomorrow",
      pago_vencido: "notif.payOverdue",
      solicitud_acceso: "notif.accessRequest",
      novedad: "notif.release",
    };
    const k = clave[n.tipo];
    if (!k) return { titulo: "", detalle: "" };

    return {
      // Los lanzamientos traen su título en los dos idiomas.
      titulo: t(k, {
        name: nombre,
        amount: monto,
        date: fecha,
        title: String(n.datos[t.locale] ?? n.datos.en ?? ""),
      }),
      detalle: new Date(n.creadaEn).toLocaleDateString(t.locale, { day: "numeric", month: "short" }),
    };
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setAbierta((v) => !v);
          if (!abierta) cargar();
        }}
        aria-label={t("notif.title")}
        aria-expanded={abierta}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface-raised text-text-muted transition hover:border-gold/50 hover:text-text"
      >
        <Bell size={18} />
        {noLeidas > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[11px] font-semibold text-ink">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        ) : null}
      </button>

      {abierta ? (
        <div className="fixed left-4 right-4 top-[4.25rem] z-50 overflow-hidden rounded-xl border border-line bg-surface shadow-2xl shadow-black/30 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-medium text-text">{t("notif.title")}</p>
            {noLeidas > 0 ? (
              <button
                type="button"
                onClick={() => void marcar({ todas: true })}
                className="flex items-center gap-1 text-xs text-text-muted transition hover:text-text"
              >
                <CheckCheck size={14} />
                {t("notif.markAll")}
              </button>
            ) : null}
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-text-muted">{t("notif.empty")}</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((n) => {
                const { titulo, detalle } = texto(n);
                if (!titulo) return null;
                return (
                  <li key={n.id} className="border-b border-line last:border-b-0">
                    <button
                      type="button"
                      onClick={() => abrir(n)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-surface-raised"
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.leida ? "bg-transparent" : "bg-gold"}`}
                      />
                      <span className="min-w-0">
                        <span className={`block text-sm ${n.leida ? "text-text-muted" : "text-text"}`}>
                          {titulo}
                        </span>
                        <span className="block text-xs text-text-muted">{detalle}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
