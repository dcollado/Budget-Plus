"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import CuadroTransferencias from "@/components/presupuesto/CuadroTransferencias";
import type { CuadroTransferencias as Cuadro } from "@/lib/household/transferencias";
import { quincena } from "@/lib/household/transferencias";
import { formatearCentavos } from "@/lib/household/formato";
import { sectionCardClass } from "@/lib/ui";

const CLAVE_ABIERTA = "presupuesto:transferencias-abierta";
const EVENTO = "transferencias-abierta";

// Abierta/cerrada se recuerda en este navegador (localStorage). Se lee con
// useSyncExternalStore: en el servidor (y si el almacenamiento está
// bloqueado, ej. modo privado) vale "abierta".
// Respaldo en memoria para cuando localStorage no se puede usar.
let abiertaEnMemoria = true;

function leerAbierta(): boolean {
  try {
    return localStorage.getItem(CLAVE_ABIERTA) !== "false";
  } catch {
    return abiertaEnMemoria;
  }
}

function suscribir(avisar: () => void) {
  window.addEventListener("storage", avisar);
  window.addEventListener(EVENTO, avisar);
  return () => {
    window.removeEventListener("storage", avisar);
    window.removeEventListener(EVENTO, avisar);
  };
}

// "Tus transferencias" arriba de todo en Presupuesto, a todo el ancho.
// Se colapsa tocando el encabezado; colapsada igual muestra total y
// remanente.
export default function TarjetaTransferencias({ cuadro }: { cuadro: Cuadro | null }) {
  const abierta = useSyncExternalStore(suscribir, leerAbierta, () => true);

  function alternar() {
    abiertaEnMemoria = !abierta;
    try {
      localStorage.setItem(CLAVE_ABIERTA, String(!abierta));
    } catch {
      // no se puede recordar; igual avisamos para que cambie en pantalla
    }
    window.dispatchEvent(new Event(EVENTO));
  }

  return (
    <div className={`${sectionCardClass} mb-8 p-0`}>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={alternar}
          aria-expanded={abierta}
          className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-left"
        >
          <ChevronDown
            size={16}
            className={`shrink-0 text-text-muted transition ${abierta ? "" : "-rotate-90"}`}
          />
          <h2 className="whitespace-nowrap text-sm font-semibold text-text">Tus transferencias</h2>

          {/* Resumen visible con la tarjeta cerrada. En el celular baja a su
              propia línea (basis-full), en pantallas anchas va a la derecha. */}
          {!abierta && cuadro ? (
            <span className="flex basis-full flex-wrap gap-x-3 pl-6 text-xs text-text-muted sm:ml-auto sm:basis-auto sm:justify-end sm:pl-0">
              <span className="whitespace-nowrap">
                Total{" "}
                <span className="font-semibold text-text">
                  {formatearCentavos(cuadro.totalCents)}
                </span>{" "}
                / {formatearCentavos(quincena(cuadro.totalCents))}
              </span>
              {cuadro.salarioCents > 0 ? (
                <span className="whitespace-nowrap">
                  Remanente{" "}
                  <span
                    className={`font-semibold ${
                      cuadro.remanenteCents < 0 ? "text-rust" : "text-sage"
                    }`}
                  >
                    {formatearCentavos(cuadro.remanenteCents)}
                  </span>
                </span>
              ) : null}
            </span>
          ) : null}
        </button>

        {abierta ? (
          <Link
            href="/configuracion?tab=cuentas"
            className="shrink-0 text-xs text-gold hover:underline"
          >
            Editar cuentas →
          </Link>
        ) : null}
      </div>

      {abierta ? (
        <div className="border-t border-line">
          {cuadro ? (
            <CuadroTransferencias cuadro={cuadro} />
          ) : (
            <p className="px-4 py-4 text-center text-sm text-text-muted">Cargando...</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
