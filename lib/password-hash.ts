const ITERATIONS = 100_000;
const HASH_ALG = "SHA-256";
const KEY_LENGTH = 256;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  if (hex.length % 2 !== 0) {
    throw new Error("El hash hexadecimal no tiene una longitud válida.");
  }

  const buffer = new ArrayBuffer(hex.length / 2);
  const bytes = new Uint8Array(buffer);

  for (let index = 0; index < hex.length; index += 2) {
    bytes[index / 2] = Number.parseInt(hex.slice(index, index + 2), 16);
  }

  return bytes;
}

function encodeText(value: string): Uint8Array<ArrayBuffer> {
  const encoded = new TextEncoder().encode(value);

  // Creamos una copia respaldada por ArrayBuffer para satisfacer
  // los tipos estrictos de Web Crypto y TypeScript.
  const buffer = new ArrayBuffer(encoded.byteLength);
  const bytes = new Uint8Array(buffer);

  bytes.set(encoded);

  return bytes;
}

async function derivePasswordHash(
  password: string,
  salt: Uint8Array<ArrayBuffer>
): Promise<string> {
  const passwordBytes = encodeText(password);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBytes,
    {
      name: "PBKDF2",
    },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: HASH_ALG,
    },
    keyMaterial,
    KEY_LENGTH
  );

  return bytesToHex(new Uint8Array(derivedBits));
}

export async function hashPassword(password: string): Promise<string> {
  const saltBuffer = new ArrayBuffer(16);
  const salt = new Uint8Array(saltBuffer);

  crypto.getRandomValues(salt);

  const hash = await derivePasswordHash(password, salt);

  return `${bytesToHex(salt)}:${hash}`;
}

export async function verifyPassword(
  password: string,
  storedPassword: string
): Promise<boolean> {
  const [saltHex, expectedHash] = storedPassword.split(":");

  if (!saltHex || !expectedHash) {
    return false;
  }

  const salt = hexToBytes(saltHex);
  const calculatedHash = await derivePasswordHash(password, salt);

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
}