"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

type QrScannerProps = {
  onScan: (decodedText: string) => void;
  onClose: () => void;
};

export default function QrScanner({ onScan, onClose }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isMountedRef = useRef(true);
  const [scannerError, setScannerError] = useState("");

  useEffect(() => {
    isMountedRef.current = true;

    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          async (decodedText) => {
            if (!isMountedRef.current) return;

            try {
              await scanner.stop();
            } catch (stopError) {
              console.error("Error deteniendo scanner:", stopError);
            }

            onScan(decodedText);
          },
          () => {
            // ignoramos errores de frames mientras busca el QR
          }
        );
      } catch (err) {
        console.error("No se pudo iniciar la cámara:", err);
        setScannerError(
          "No se pudo abrir la cámara. Verifica permisos y prueba en HTTPS o localhost."
        );
      }
    };

    startScanner();

    return () => {
      isMountedRef.current = false;

      const cleanup = async () => {
        try {
          if (scannerRef.current) {
            const state = scannerRef.current.getState();
            if (state === 2) {
              await scannerRef.current.stop();
            }
            await scannerRef.current.clear();
          }
        } catch (err) {
          console.error("Error limpiando scanner:", err);
        }
      };

      cleanup();
    };
  }, [onScan]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Escanear QR</h2>
          <p className="mt-1 text-xs text-slate-500">
            Apunta la cámara al QR de la factura.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Cerrar
        </button>
      </div>

      <div
        id="qr-reader"
        className="overflow-hidden rounded-xl border border-slate-200"
      />

      {scannerError ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {scannerError}
        </p>
      ) : null}
    </div>
  );
}