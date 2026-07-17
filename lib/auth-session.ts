const COOKIE_NAME = "facturapp_session";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("Falta SESSION_SECRET en las variables de entorno.");
  }

  return secret;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);

  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
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
  expiresAt: number;
};

export async function createSessionToken(
  usuarioId: string,
  username: string
): Promise<string> {
  const payload: SessionPayload = {
    usuarioId,
    username,
    expiresAt: Date.now() + 8 * 60 * 60 * 1000,
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
