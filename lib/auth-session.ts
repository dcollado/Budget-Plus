import { base64UrlToBytes, bytesToBase64Url } from "@/lib/base64url";

const COOKIE_NAME = "facturapp_session";

// Sesión normal: 8 horas. Con "mantener sesión iniciada": 30 días. En ambos casos
// la cuenta se revalida en cada petición (activa, hogar no archivado, versión).
export const SESION_CORTA_SEGUNDOS = 8 * 60 * 60;
export const SESION_LARGA_SEGUNDOS = 30 * 24 * 60 * 60;

export const duracionSesionSegundos = (larga: boolean) =>
  larga ? SESION_LARGA_SEGUNDOS : SESION_CORTA_SEGUNDOS;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("SESSION_SECRET is missing from the environment variables.");
  }

  return secret;
}

async function getSigningKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign", "verify"]
  );
}

export type SessionPayload = {
  usuarioId: string;
  username: string;
  // Versión de sesión de la cuenta al iniciar. Ausente = 0.
  sv?: number;
  // Inició con "mantener sesión iniciada" (para conservarlo al reemitir la cookie).
  larga?: boolean;
  expiresAt: number;
};

export async function createSessionToken(
  usuarioId: string,
  username: string,
  sv = 0,
  larga = false
): Promise<string> {
  const payload: SessionPayload = {
    usuarioId,
    username,
    sv,
    ...(larga ? { larga: true } : {}),
    expiresAt: Date.now() + duracionSesionSegundos(larga) * 1000,
  };

  const encodedPayload = bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify(payload))
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    await getSigningKey(),
    new TextEncoder().encode(encodedPayload)
  );

  return `${encodedPayload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) {
    return null;
  }

  const [encodedPayload, encodedSignature] = token.split(".");

  if (!encodedPayload || !encodedSignature) {
    return null;
  }

  try {
    const isValidSignature = await crypto.subtle.verify(
      "HMAC",
      await getSigningKey(),
      base64UrlToBytes(encodedSignature),
      new TextEncoder().encode(encodedPayload)
    );

    if (!isValidSignature) {
      return null;
    }

    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(encodedPayload))
    ) as Partial<SessionPayload>;

    if (
      typeof payload.usuarioId !== "string" ||
      typeof payload.username !== "string" ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= Date.now()
    ) {
      return null;
    }

    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
