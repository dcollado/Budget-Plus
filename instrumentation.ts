import type { Instrumentation } from "next";

// Errores del servidor con contexto, en una sola línea buscable en los logs de
// Vercel (Observability > Logs, buscar "[server-error]").
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const e = err as Error & { digest?: string };
  console.error(
    "[server-error]",
    JSON.stringify({
      message: e.message,
      digest: e.digest,
      method: request.method,
      path: request.path,
      route: context.routePath,
      type: context.routeType,
    })
  );
};
