"use client";

import { useState } from "react";
import { categoriasFactura, tiposFactura } from "@/lib/facturas";
import {
  fieldBaseClass,
  fieldNormalClass,
  fieldErrorClass,
  helperTextClass,
  labelClass,
  sectionCardClass,
} from "@/lib/ui";
import QrScanner from "@/components/qr-scanner";

type FormState = {
  fecha: string;
  proveedor: string;
  monto: string;
  categoria: string;
  tipo: string;
  notas: string;
};

const initialForm: FormState = {
  fecha: "",
  proveedor: "",
  monto: "",
  categoria: "",
  tipo: "",
  notas: "",
};

function isDgiQrUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "dgi-fep.mef.gob.pa" &&
      parsed.pathname.includes("/Consultas/FacturasPorQR")
    );
  } catch {
    return false;
  }
}

export default function NuevaFacturaPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [fileName, setFileName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [isReadingQr, setIsReadingQr] = useState(false);

  const requiredFields: (keyof FormState)[] = [
    "fecha",
    "proveedor",
    "monto",
    "categoria",
    "tipo",
  ];

  const hasError = (field: keyof FormState) => {
    if (!error) return false;
    return requiredFields.includes(field) && !form[field];
  };

  const getFieldClass = (field: keyof FormState) =>
    `${fieldBaseClass} ${hasError(field) ? fieldErrorClass : fieldNormalClass}`;

  const getSelectClass = (field: keyof FormState) =>
    `${fieldBaseClass} appearance-none ${
      form[field] ? "text-slate-900" : "text-slate-400"
    } ${hasError(field) ? fieldErrorClass : fieldNormalClass}`;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  const handleQrScan = async (decodedText: string) => {
    setMensaje("");
    setError("");

    if (!isDgiQrUrl(decodedText)) {
      setError("El QR leído no parece ser una factura electrónica válida de la DGI.");
      setShowScanner(false);
      return;
    }

    setIsReadingQr(true);

    try {
      const res = await fetch("/api/facturas/leer-qr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: decodedText }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "No se pudo leer la factura desde la DGI.");
      }

      const factura = data.data;

      setForm((prev) => ({
        ...prev,
        fecha: factura.fecha || prev.fecha,
        proveedor: factura.proveedor || prev.proveedor,
        monto: factura.monto || prev.monto,
        tipo: "Fiscal",
      }));

      setMensaje(
        "Factura fiscal leída desde la DGI. Revisa fecha, proveedor y monto antes de guardar."
      );
      setShowScanner(false);
    } catch (err) {
      console.error("Error procesando QR:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error leyendo el QR."
      );
      setShowScanner(false);
    } finally {
      setIsReadingQr(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMensaje("");
    setError("");

    if (requiredFields.some((field) => !form[field])) {
      setError("Completa los campos obligatorios.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/facturas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        console.error("Respuesta del backend con error:", data);
        throw new Error(data.message || "No se pudo guardar la factura");
      }

      setMensaje("Factura guardada correctamente.");
      setForm(initialForm);
      setFileName("");
      setShowScanner(false);
    } catch (err) {
      console.error("Error al enviar factura:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Hubo un error al guardar la factura."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl">
        <div className={sectionCardClass}>
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Nueva factura
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Registra una factura manualmente y organízala por tipo, mes y año.
              </p>
            </div>

            <a
              href="/facturas"
              className="hidden rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-400 hover:bg-slate-50 md:inline-flex"
            >
              Ver facturas
            </a>
          </div>

          <div className="mb-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowScanner((prev) => !prev)}
              disabled={isSubmitting || isReadingQr}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {showScanner ? "Ocultar escáner" : "Escanear QR DGI"}
            </button>

            {isReadingQr ? (
              <span className="inline-flex items-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
                Consultando la DGI...
              </span>
            ) : null}
          </div>

          {showScanner ? (
            <div className="mb-5">
              <QrScanner
                onScan={handleQrScan}
                onClose={() => setShowScanner(false)}
              />
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="fecha" className={labelClass}>
                  Fecha de factura
                </label>
                <input
                  id="fecha"
                  type="date"
                  name="fecha"
                  value={form.fecha}
                  onChange={handleChange}
                  className={getFieldClass("fecha")}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="monto" className={labelClass}>
                  Monto
                </label>
                <input
                  id="monto"
                  type="number"
                  name="monto"
                  value={form.monto}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className={getFieldClass("monto")}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label htmlFor="proveedor" className={labelClass}>
                Proveedor
              </label>
              <input
                id="proveedor"
                type="text"
                name="proveedor"
                value={form.proveedor}
                onChange={handleChange}
                placeholder="Ej. Supermercado X"
                className={getFieldClass("proveedor")}
                disabled={isSubmitting}
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="relative">
                <label htmlFor="categoria" className={labelClass}>
                  Categoría
                </label>
                <select
                  id="categoria"
                  name="categoria"
                  value={form.categoria}
                  onChange={handleChange}
                  className={getSelectClass("categoria")}
                  disabled={isSubmitting}
                >
                  <option value="">Selecciona una categoría</option>
                  {categoriasFactura.map((categoria) => (
                    <option key={categoria} value={categoria}>
                      {categoria}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-4 top-[42px] text-slate-400">
                  ▾
                </span>
              </div>

              <div className="relative">
                <label htmlFor="tipo" className={labelClass}>
                  Tipo de factura
                </label>
                <select
                  id="tipo"
                  name="tipo"
                  value={form.tipo}
                  onChange={handleChange}
                  className={getSelectClass("tipo")}
                  disabled={isSubmitting}
                >
                  <option value="">Selecciona un tipo</option>
                  {tiposFactura.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-4 top-[42px] text-slate-400">
                  ▾
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="archivo" className={labelClass}>
                Archivo
              </label>

              <label
                htmlFor="archivo"
                className={`flex cursor-pointer items-center justify-between rounded-xl border border-dashed px-4 py-3 text-sm transition ${
                  fileName
                    ? "border-indigo-500 bg-indigo-50 text-slate-900"
                    : "border-slate-300 bg-white text-slate-500 hover:border-indigo-400 hover:bg-slate-50"
                }`}
              >
                <span className="truncate pr-4">
                  {fileName ? fileName : "Selecciona una imagen o PDF"}
                </span>
                <span className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                  Explorar
                </span>
              </label>

              <input
                id="archivo"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                className="hidden"
                disabled={isSubmitting}
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
              />

              <p className={helperTextClass}>
                Por ahora el archivo no se está guardando todavía. Estamos dejando
                listo el UI sin romper el guardado actual.
              </p>
            </div>

            <div>
              <label htmlFor="notas" className={labelClass}>
                Notas
              </label>
              <textarea
                id="notas"
                name="notas"
                value={form.notas}
                onChange={handleChange}
                rows={4}
                placeholder="Observaciones"
                className={`${fieldBaseClass} ${fieldNormalClass} resize-none`}
                disabled={isSubmitting}
              />
            </div>

            {mensaje ? (
              <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {mensaje}
              </p>
            ) : null}

            {error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col gap-3 pt-1 sm:flex-row">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Guardando..." : "Guardar factura"}
              </button>

              <a
                href="/"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-indigo-400 hover:bg-slate-50"
              >
                Volver
              </a>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}