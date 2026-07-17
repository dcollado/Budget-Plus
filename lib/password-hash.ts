// Hash de contraseñas con PBKDF2 vía Web Crypto — a propósito no usa
// bcrypt/argon2 porque esas librerías no corren en el runtime Edge donde
// vive el middleware. Web Crypto sí funciona en Edge y en Node, sin
// dependencias nuevas.

const ITERATIONS = 100_000;
const HASH_ALG = "SHA-256";
const KEY_LENGTH_BITS = 256;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function derivarHash(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: HASH_ALG,
    },
    keyMaterial,
    KEY_LENGTH_BITS
  );

  return new Uint8Array(bits);
}

// Formato guardado en la hoja: "salt:hash", ambos en base64url.
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivarHash(password, salt);
  return `${bytesToBase64Url(salt)}:${bytesToBase64Url(hash)}`;
}

export async function verifyPassword(
  password: string,
  almacenado: string
): Promise<boolean> {
  const [saltB64, hashB64] = (almacenado ?? "").split(":");
  if (!saltB64 || !hashB64) return false;

  const salt = base64UrlToBytes(saltB64);
  const hashEsperado = base64UrlToBytes(hashB64);
  const hashCalculado = await derivarHash(password, salt);

  if (hashCalculado.length !== hashEsperado.length) return false;

  // Comparación en tiempo constante — no cortar apenas difiere un byte.
  let diff = 0;
  for (let i = 0; i < hashCalculado.length; i += 1) {
    diff |= hashCalculado[i] ^ hashEsperado[i];
  }
  return diff === 0;
}
