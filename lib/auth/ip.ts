// IP del cliente para el freno de fuerza bruta. Detrás de Vercel el primer
// valor de x-forwarded-for es el cliente; sin proxy cae a x-real-ip.
export function ipDe(headers: Headers): string {
  const reenviada = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return reenviada || headers.get("x-real-ip")?.trim() || "desconocida";
}
