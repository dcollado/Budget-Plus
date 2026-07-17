// Genera el hash de una contraseña para pegar en la columna "passwordHash"
// de la hoja Usuarios. Corre 100% local — la contraseña nunca sale de tu
// computadora.
//
// Uso:
//   node scripts/generar-hash.mjs "tuContraseña"

import { webcrypto as crypto } from "node:crypto";

const ITERATIONS = 100_000;
const HASH_ALG = "SHA-256";
const KEY_LENGTH_BITS = 256;

function bytesToBase64Url(bytes) {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function derivarHash(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: HASH_ALG },
    keyMaterial,
    KEY_LENGTH_BITS
  );

  return new Uint8Array(bits);
}

async function main() {
  const password = process.argv[2];

  if (!password) {
    console.error('Uso: node scripts/generar-hash.mjs "tuContraseña"');
    process.exit(1);
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivarHash(password, salt);
  const resultado = `${bytesToBase64Url(salt)}:${bytesToBase64Url(hash)}`;

  console.log("\nPegá esto en la columna passwordHash de la hoja Usuarios:\n");
  console.log(resultado);
  console.log();
}

main();
