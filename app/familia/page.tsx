"use client";

import { useEffect, useMemo, useState } from "react";
import { Wallet, Receipt, ArrowUpRight, ArrowDownRight } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import CategoryBar from "@/components/dashboard/CategoryBar";

const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const mesesCompletos = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

type SplitPorUsuario = { usuarioId: string; nombre: string; monto: number };

type ReporteFamiliar = {
  ingresos: {
    total: number;
    porUsuario: SplitPorUsuario[];
    salarioFijo: number;
    pagosFijos: number;
    ingresosExtra: number;
  };
  gastos: { total: number; porUsuario: SplitPorUsuario[] };
  neto: number;
  porCategoria: { categoria: string; monto: number }[];
};

function formatMoney(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatSplit(porUsuario: SplitPorUsuario[]): string {
  if (porUsuario.length === 0) return "Sin movimientos";
  return porUsuario.map((p) => `${p.nombre} ${formatMoney(p.monto)}`).join(" · ");
}

export default function FamiliaPage() {
  const [reporte, setReporte] = useState<ReporteFamiliar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const ahora = new Date();
  const mesActual = String(ahora.getMonth() + 1).padStart(2, "0");
  const anioActual = String(ahora.getFullYear());
  const periodoActual = `${anioActual}-${mesActual}`;
  const etiquetaMes = `${mesesCompletos[Number(mesActual) - 1]} ${anioActual}`;

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/reportes/familia?periodo=${periodoActual}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "No se pudo cargar el reporte familiar.");
        }
        setReporte(data.data as ReporteFamiliar);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Ocurrió un error cargando el reporte."
        );
      } finally {
        setLoading(false);
      }
    };

    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxCategoria = useMemo(() => {
    if (!reporte || reporte.porCategoria.length === 0) return 0;
    return reporte.porCategoria[0].monto;
  }, [reporte]);

  return (
    <main className="min-h-screen bg-ink p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-text">
            Familia
          </h1>
          <p className="text-sm text-text-muted">
            {etiquetaMes} · consolidado de ambos
          </p>
        </div>

        {error ? (
          <p className="rounded-xl border border-rust/30 bg-rust-soft px-4 py-3 text-sm text-rust">
            {error}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Ingresos"
            value={loading || !reporte ? "..." : formatMoney(reporte.ingresos.total)}
            icon={Wallet}
            accent="sage"
            sub={loading || !reporte ? undefined : formatSplit(reporte.ingresos.porUsuario)}
            detalles={
              loading || !reporte || reporte.ingresos.total === 0
                ? undefined
                : [
                    {
                      label: `Salario fijo${
                        reporte.ingresos.pagosFijos > 0
                          ? ` · ${reporte.ingresos.pagosFijos} pago${
                              reporte.ingresos.pagosFijos === 1 ? "" : "s"
                            }`
                          : ""
                      }`,
                      value: formatMoney(reporte.ingresos.salarioFijo),
                    },
                    {
                      label: "Ingresos extra",
                      value: formatMoney(reporte.ingresos.ingresosExtra),
                    },
                  ]
            }
          />
          <StatCard
            label="Gastos"
            value={loading || !reporte ? "..." : formatMoney(reporte.gastos.total)}
            icon={Receipt}
            accent="rust"
            sub={loading || !reporte ? undefined : formatSplit(reporte.gastos.porUsuario)}
          />
          <StatCard
            label="Neto"
            value={loading || !reporte ? "..." : formatMoney(reporte.neto)}
            icon={reporte && reporte.neto >= 0 ? ArrowUpRight : ArrowDownRight}
            accent="gold"
          />
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="px-1 text-sm font-semibold text-text">Adónde va el dinero</h2>
          <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
            {loading ? (
              <p className="text-xs text-text-muted">Cargando...</p>
            ) : !reporte || reporte.porCategoria.length === 0 ? (
              <p className="text-xs text-text-muted">
                Todavía no hay gastos registrados este mes.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {reporte.porCategoria.map((c) => (
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
      </div>
    </main>
  );
}
