import { base64UrlToBytes, bytesToBase64Url } from "@/lib/base64url";

// Formato viejo "salt:hash" (100k). Nuevo: "pbkdf2-sha256$<iteraciones>$salt$hash".
const ITERATIONS_VIEJAS = 100_000;
const ITERATIONS = 600_000;
const PREFIJO = "pbkdf2-sha256$";
const HASH_ALG = "SHA-256";
const KEY_LENGTH = 256;

function encodeText(value: string): Uint8Array<ArrayBuffer> {
  const encoded = new TextEncoder().encode(value);

  const buffer = new ArrayBuffer(encoded.byteLength);
  const bytes = new Uint8Array(buffer);

  bytes.set(encoded);

  return bytes;
}

async function derivePasswordHash(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number
): Promise<Uint8Array<ArrayBuffer>> {
  const passwordBytes = encodeText(password);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBytes,
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: HASH_ALG,
    },
    keyMaterial,
    KEY_LENGTH
  );

  return new Uint8Array(derivedBits);
}

export async function hashPassword(password: string): Promise<string> {
  const saltBuffer = new ArrayBuffer(16);
  const salt = new Uint8Array(saltBuffer);

  crypto.getRandomValues(salt);

  const hash = await derivePasswordHash(password, salt, ITERATIONS);

  return `${PREFIJO}${ITERATIONS}$${bytesToBase64Url(salt)}$${bytesToBase64Url(hash)}`;
}

// true si el hash guardado usa el formato o las iteraciones viejas: al
// iniciar sesión con éxito se vuelve a guardar con el nuevo.
export function passwordNecesitaRehash(storedPassword: string): boolean {
  const stored = storedPassword.trim();
  if (!stored.startsWith(PREFIJO)) return true;
  return Number(stored.split("$")[1]) < ITERATIONS;
}

function leerAlmacenado(stored: string): {
  iterations: number;
  saltEncoded: string;
  expectedHash: string;
} | null {
  const valor = stored.trim();

  if (valor.startsWith(PREFIJO)) {
    const [, iter, saltEncoded, expectedHash] = valor.split("$");
    const iterations = Number(iter);
    if (!saltEncoded || !expectedHash || !Number.isInteger(iterations) || iterations < 1) {
      return null;
    }
    return { iterations, saltEncoded, expectedHash };
  }

  const [saltEncoded, expectedHash] = valor.split(":");
  if (!saltEncoded || !expectedHash) return null;
  return { iterations: ITERATIONS_VIEJAS, saltEncoded, expectedHash };
}

export async function verifyPassword(
  password: string,
  storedPassword: string
): Promise<boolean> {
  const almacenado = leerAlmacenado(storedPassword);

  if (!almacenado) {
    return false;
  }

  const { iterations, saltEncoded, expectedHash } = almacenado;

  try {
    const salt = base64UrlToBytes(saltEncoded);
    const calculatedHashBytes = await derivePasswordHash(password, salt, iterations);
    const calculatedHash = bytesToBase64Url(calculatedHashBytes);

    if (calculatedHash.length !== expectedHash.length) {
      return false;
    }

    let difference = 0;

    for (let index = 0; index < calculatedHash.length; index += 1) {
      difference |=
        calculatedHash.charCodeAt(index) ^
        expectedHash.charCodeAt(index);
    }

    return difference === 0;
  } catch {
    return false;
  }
}

// Hash válido de una contraseña que nadie conoce, con las iteraciones
// actuales. Se verifica contra él cuando el usuario no existe para que
// responder tarde lo mismo que con un usuario real (no delatar cuentas).
const HASH_FALSO = `${PREFIJO}${ITERATIONS}$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;

export async function gastarTiempoDeVerificacion(password: string): Promise<void> {
  await verifyPassword(password, HASH_FALSO);
}
