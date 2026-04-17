"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

type QrScannerProps = {
  onScan: (decodedText: string) => Promise<void> | void;
  onClose: () => void;
};

export default function QrScanner({ onScan, onClose }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isMountedRef = useRef(false);
  const isHandlingScanRef = useRef(false);
  const [scannerError, setScannerError] = useState("");
  const [debugInfo, setDebugInfo] = useState("");

  useEffect(() => {
    isMountedRef.current = true;

    const handleDecodedText = async (
      scanner: Html5Qrcode,
      decodedText: string
    ) => {
      if (!isMountedRef.current || isHandlingScanRef.current) return;

      isHandlingScanRef.current = true;
      setDebugInfo("QR detectado. Procesando...");

      try {
        await scanner.stop();
      } catch (stopError) {
        console.error("Error deteniendo scanner:", stopError);
      }

      try {
        await scanner.clear();
      } catch (clearError) {
        console.error("Error limpiando scanner:", clearError);
      }

      await onScan(decodedText);
    };

    const startScanner = async () => {
      try {
        if (
          typeof window === "undefined" ||
          !navigator.mediaDevices ||
          !navigator.mediaDevices.getUserMedia
        ) {
          setScannerError(
            "La cámara no está disponible aquí. Asegúrate de estar usando HTTPS o localhost."
          );
          return;
        }

        setDebugInfo("Inicializando cámara...");

        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        const config = {
          fps: 15,
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1,
        };

        try {
          await scanner.start(
            { facingMode: "environment" },
            config,
            async (decodedText) => {
              await handleDecodedText(scanner, decodedText);
            },
            () => {}
          );
        } catch (firstError) {
          console.warn(
            "No se pudo usar facingMode environment. Intentando por cámaras disponibles...",
            firstError
          );

          const cameras = await Html5Qrcode.getCameras();

          if (!cameras.length) {
            throw new Error("No se encontraron cámaras disponibles.");
          }

          const preferredCamera =
            cameras.find((camera) =>
              /back|rear|environment|trasera/i.test(camera.label)
            ) || cameras[0];

          await scanner.start(
            preferredCamera.id,
            config,
            async (decodedText) => {
              await handleDecodedText(scanner, decodedText);
            },
            () => {}
          );
        }

        setDebugInfo("Cámara activa. Apunta al QR de la factura.");
      } catch (err) {
        console.error("No se pudo iniciar la cámara:", err);

        let message = "No se pudo abrir la cámara.";

        if (err instanceof Error) {
          if (err.name === "NotAllowedError") {
            message =
              "Permiso de cámara denegado. Debes permitir acceso a la cámara.";
          } else if (err.name === "NotFoundError") {
            message = "No se encontró una cámara disponible.";
          } else if (err.name === "NotReadableError") {
            message = "La cámara está ocupada por otra app o pestaña.";
          } else {
            message = `No se pudo iniciar la cámara: ${err.message}`;
          }
        }

        setScannerError(message);
        setDebugInfo("");
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
            Apunta la cámara al QR de la factura electrónica.
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

      {debugInfo ? (
        <p className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {debugInfo}
        </p>
      ) : null}

      {scannerError ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {scannerError}
        </p>
      ) : null}
    </div>
  );
}