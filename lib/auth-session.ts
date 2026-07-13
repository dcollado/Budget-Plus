const COOKIE_NAME = "facturapp_session";

function getSecret(): string {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.BASIC_AUTH_PASSWORD;

  if (!secret) {
    throw new Error(
      "Falta SESSION_SECRET o BASIC_AUTH_PASSWORD en las variables de entorno."
    );
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

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);

  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
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

export async function createSessionToken(username: string): Promise<string> {
  const payload = {
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
): Promise<boolean> {
  if (!token) {
    return false;
  }

  const [encodedPayload, encodedSignature] = token.split(".");

  if (!encodedPayload || !encodedSignature) {
    return false;
  }

  try {
    const isValidSignature = await crypto.subtle.verify(
      "HMAC",
      await getSigningKey(),
      base64UrlToBytes(encodedSignature),
      new TextEncoder().encode(encodedPayload)
    );

    if (!isValidSignature) {
      return false;
    }

    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(encodedPayload))
    ) as {
      username?: string;
      expiresAt?: number;
    };

    return (
      payload.username === process.env.BASIC_AUTH_USER &&
      typeof payload.expiresAt === "number" &&
      payload.expiresAt > Date.now()
    );
  } catch {
    return false;
  }
}

export { COOKIE_NAME };
