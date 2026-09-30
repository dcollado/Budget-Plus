"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { CuadroTransferencias as Cuadro } from "@/lib/household/transferencias";
import { quincena } from "@/lib/household/transferencias";
import { formatearCentavos } from "@/lib/household/formato";

// Tabla "cuenta · mensual · quincenal" + total, salario y remanente. Cada
// cuenta se puede abrir para ver qué fijos la componen.
export default function CuadroTransferencias({ cuadro }: { cuadro: Cuadro }) {
  const [abierta, setAbierta] = useState<string | null>(null);

  if (cuadro.filas.length === 0) {
    return (
      <p className="px-4 py-3 text-sm text-text-muted">
        No tenés gastos fijos a tu nombre todavía.
      </p>
    );
  }

  return (
    <div className="text-sm">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 border-b border-line px-4 py-2 text-[11px] uppercase tracking-wide text-text-muted">
        <span>Cuenta</span>
        <span className="w-20 text-right">Mensual</span>
        <span className="w-20 text-right">Quincenal</span>
      </div>

      {cuadro.filas.map((fila) => {
        const clave = fila.cuentaId || "sin-cuenta";
        const estaAbierta = abierta === clave;

        return (
          <div key={clave} className="border-b border-line">
            <button
              type="button"
              onClick={() => setAbierta(estaAbierta ? null : clave)}
              aria-expanded={estaAbierta}
              className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 px-4 py-2 text-left transition hover:bg-surface-raised/50"
            >
              <span
                className={`flex min-w-0 items-center gap-1 ${
                  fila.cuentaId ? "text-text" : "italic text-text-muted"
                }`}
              >
                <ChevronDown
                  size={13}
                  className={`shrink-0 text-text-muted transition ${estaAbierta ? "" : "-rotate-90"}`}
                />
                {/* Sin truncar: "Cuenta Quincena" vs "Cuenta Chippu" tienen
                    que distinguirse en el celular, aunque salte de línea. */}
                <span className="break-words">{fila.nombre}</span>
              </span>
              <span className="w-20 text-right font-medium text-text">
                {formatearCentavos(fila.totalCents)}
              </span>
              <span className="w-20 text-right text-text-muted">
                {formatearCentavos(quincena(fila.totalCents))}
              </span>
            </button>

            {estaAbierta ? (
              <ul className="pb-2 pl-10 pr-4 text-xs text-text-muted">
                {fila.items.map((item) => (
                  <li key={item.category.id} className="flex justify-between gap-2 py-0.5">
                    <span className="truncate">{item.category.name}</span>
                    <span className="whitespace-nowrap">
                      {formatearCentavos(item.plannedAmountCents)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}

      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 gap-y-1 bg-surface-raised/60 px-4 py-3">
        <span className="font-semibold text-text">Total</span>
        <span className="w-20 text-right font-semibold text-text">
          {formatearCentavos(cuadro.totalCents)}
        </span>
        <span className="w-20 text-right font-semibold text-text">
          {formatearCentavos(quincena(cuadro.totalCents))}
        </span>

        {cuadro.salarioCents > 0 ? (
          <>
            <span className="text-text-muted">Salario</span>
            <span className="w-20 text-right text-text-muted">
              {formatearCentavos(cuadro.salarioCents)}
            </span>
            <span className="w-20 text-right text-text-muted">
              {formatearCentavos(quincena(cuadro.salarioCents))}
            </span>

            <span className="font-semibold text-text">Remanente</span>
            <span
              className={`w-20 text-right font-semibold ${
                cuadro.remanenteCents < 0 ? "text-rust" : "text-sage"
              }`}
            >
              {formatearCentavos(cuadro.remanenteCents)}
            </span>
            <span
              className={`w-20 text-right font-semibold ${
                cuadro.remanenteCents < 0 ? "text-rust" : "text-sage"
              }`}
            >
              {formatearCentavos(quincena(cuadro.remanenteCents))}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}
