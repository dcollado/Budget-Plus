"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Wallet, Receipt, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { Movimiento, TipoMovimiento } from "@/lib/movimientos-store";
import type { Deuda } from "@/lib/deudas";
import StatCard from "@/components/dashboard/StatCard";
import CategoryBar from "@/components/dashboard/CategoryBar";
import DeudaCard from "@/components/dashboard/DeudaCard";
import QuickAddModal from "@/components/dashboard/modals/QuickAddModal";
import PrestamoEditModal from "@/components/dashboard/modals/PrestamoEditModal";
import TarjetaEditModal from "@/components/dashboard/modals/TarjetaEditModal";
import DeudaEditModal from "@/components/dashboard/modals/DeudaEditModal";

const mesesCompletos = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function formatMoney(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}


export default function Home() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalTipo, setModalTipo] = useState<TipoMovimiento | null>(null);
  const [editandoDeudaId, setEditandoDeudaId] = useState<string | null>(null);

  const ahora = new Date();
  const mesActual = String(ahora.getMonth() + 1).padStart(2, "0");
  const anioActual = String(ahora.getFullYear());
  const periodoActual = `${anioActual}-${mesActual}`;
  const etiquetaMes = `${mesesCompletos[Number(mesActual) - 1]} ${anioActual}`;

  const cargarDatos = async () => {
    setLoading(true);
    setError("");
    try {
      const [resMov, resDeudas] = await Promise.all([
        fetch(`/api/movimientos?periodo=${periodoActual}`),
        fetch("/api/deudas"),
      ]);

      const dataMov = await resMov.json();
      const dataDeudas = await resDeudas.json();

      if (!resMov.ok || !dataMov.success) {
        throw new Error(dataMov.message || "No se pudieron cargar los movimientos.");
      }
      if (!resDeudas.ok || !dataDeudas.success) {
        throw new Error(dataDeudas.message || "No se pudieron cargar las deudas.");
      }

      setMovimientos(dataMov.data ?? []);
      setDeudas(dataDeudas.data ?? []);
    } catch (err) {
      console.error("Error cargando el dashboard:", err);
      setError(
        err instanceof Error ? err.message : "Ocurrió un error cargando el panel."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { totalIngresos, totalGastos, neto, categorias, salarioFijo, pagosFijos, ingresosExtra } =
    useMemo(() => {
      let ingresos = 0;
      let gastos = 0;
      let salarioFijo = 0;
      let pagosFijos = 0;
      let ingresosExtra = 0;
      const porCategoria: Record<string, number> = {};

      movimientos.forEach((m) => {
        const montoNum = Number(m.monto) || 0;
        if (m.tipo === "ingreso") {
          ingresos += montoNum;
          if (m.origen === "fijo") {
            salarioFijo += montoNum;
            pagosFijos += 1;
          } else {
            ingresosExtra += montoNum;
          }
        } else {
          gastos += montoNum;
          porCategoria[m.categoria] = (porCategoria[m.categoria] || 0) + montoNum;
        }
      });

      const categorias = Object.entries(porCategoria)
        .map(([categoria, monto]) => ({ categoria, monto }))
        .sort((a, b) => b.monto - a.monto);

      return {
        totalIngresos: ingresos,
        totalGastos: gastos,
        neto: ingresos - gastos,
        categorias,
        salarioFijo,
        pagosFijos,
        ingresosExtra,
      };
    }, [movimientos]);

  const maxCategoria = categorias.length > 0 ? categorias[0].monto : 0;

  const handleAdded = (mov: Movimiento) => setMovimientos((prev) => [...prev, mov]);
  const handleDeudaSaved = (actualizada: Deuda) =>
    setDeudas((prev) => prev.map((d) => (d.id === actualizada.id ? actualizada : d)));


  const deudaEnEdicion = deudas.find((d) => d.id === editandoDeudaId) || null;

  return (
    <main className="min-h-screen bg-ink p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-text">
              Panel financiero
            </h1>
            <p className="text-sm text-text-muted">{etiquetaMes} · mes actual</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setModalTipo("gasto")}
              className="flex items-center gap-1.5 rounded-xl bg-rust-soft px-3 py-2 text-sm font-medium text-rust transition hover:opacity-90"
            >
              <Plus size={14} /> Gasto
            </button>
            <button
              onClick={() => setModalTipo("ingreso")}
              className="flex items-center gap-1.5 rounded-xl bg-sage-soft px-3 py-2 text-sm font-medium text-sage transition hover:opacity-90"
            >
              <Plus size={14} /> Ingreso
            </button>
          </div>
        </div>

        {error ? (
          <p className="rounded-xl border border-rust/30 bg-rust-soft px-4 py-3 text-sm text-rust">
            {error}
          </p>
        ) : null}

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Ingresos"
            value={loading ? "..." : formatMoney(totalIngresos)}
            icon={Wallet}
            accent="sage"
            detalles={
              loading || totalIngresos === 0
                ? undefined
                : [
                    {
                      label: `Salario fijo${pagosFijos > 0 ? ` · ${pagosFijos} pago${pagosFijos === 1 ? "" : "s"}` : ""}`,
                      value: formatMoney(salarioFijo),
                    },
                    { label: "Ingresos extra", value: formatMoney(ingresosExtra) },
                  ]
            }
          />
          <StatCard
            label="Gastos"
            value={loading ? "..." : formatMoney(totalGastos)}
            icon={Receipt}
            accent="rust"
          />
          <StatCard
            label="Neto"
            value={loading ? "..." : formatMoney(neto)}
            icon={neto >= 0 ? ArrowUpRight : ArrowDownRight}
            accent="gold"
          />
        </div>

        {/* Category breakdown + Deudas */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h2 className="px-1 text-sm font-semibold text-text">Adónde va el dinero</h2>
            <div className="flex flex-1 flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
              {loading ? (
                <p className="text-xs text-text-muted">Cargando...</p>
              ) : categorias.length === 0 ? (
                <p className="text-xs text-text-muted">
                  Todavía no hay gastos registrados este mes.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {categorias.map((c) => (
                    <CategoryBar
                      key={c.categoria}
                      label={c.categoria}
                      monto={c.monto}
                      max={maxCategoria}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="px-1 text-sm font-semibold text-text">Deudas</h2>
            {loading ? (
              <p className="px-1 text-xs text-text-muted">Cargando...</p>
            ) : deudas.length === 0 ? (
              <p className="px-1 text-xs text-text-muted">
                No hay deudas registradas todavía.
              </p>
            ) : (
              deudas.map((d) => (
                <DeudaCard key={d.id} deuda={d} onEdit={() => setEditandoDeudaId(d.id)} />
              ))
            )}
          </div>
        </div>


      </div>

      {modalTipo ? (
        <QuickAddModal
          tipoInicial={modalTipo}
          deudas={deudas}
          onClose={() => setModalTipo(null)}
          onAdded={handleAdded}
          onDeudaActualizada={handleDeudaSaved}
        />
      ) : null}

      {deudaEnEdicion && deudaEnEdicion.tipo === "prestamo" ? (
        <PrestamoEditModal
          deuda={deudaEnEdicion}
          onClose={() => setEditandoDeudaId(null)}
          onSaved={handleDeudaSaved}
        />
      ) : null}

      {deudaEnEdicion && deudaEnEdicion.tipo === "tarjeta" ? (
        <TarjetaEditModal
          deuda={deudaEnEdicion}
          onClose={() => setEditandoDeudaId(null)}
          onSaved={handleDeudaSaved}
        />
      ) : null}

      {deudaEnEdicion && deudaEnEdicion.tipo === "generico" ? (
        <DeudaEditModal
          deuda={deudaEnEdicion}
          onClose={() => setEditandoDeudaId(null)}
          onSaved={handleDeudaSaved}
        />
      ) : null}
    </main>
  );
}