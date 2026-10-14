import { describe, expect, it } from "vitest";
import {
  gastarTiempoDeVerificacion,
  hashPassword,
  passwordNecesitaRehash,
  verifyPassword,
} from "./password-hash";

describe("password-hash", () => {
  it("verifica la contraseña correcta y rechaza la incorrecta", async () => {
    const hash = await hashPassword("clave-segura-123");

    expect(hash.startsWith("pbkdf2-sha256$600000$")).toBe(true);
    expect(await verifyPassword("clave-segura-123", hash)).toBe(true);
    expect(await verifyPassword("otra-clave", hash)).toBe(false);
  });

  it("cada hash lleva una sal distinta", async () => {
    expect(await hashPassword("igual")).not.toBe(await hashPassword("igual"));
  });

  it("rechaza hashes mal formados sin lanzar", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "basura")).toBe(false);
    expect(await verifyPassword("x", "pbkdf2-sha256$abc$s$h")).toBe(false);
  });

  it("detecta los hashes viejos que hay que actualizar", async () => {
    expect(passwordNecesitaRehash("salt:hash")).toBe(true);
    expect(passwordNecesitaRehash("pbkdf2-sha256$100000$s$h")).toBe(true);
    expect(passwordNecesitaRehash(await hashPassword("x"))).toBe(false);
  });

  it("el hash falso del login tiene formato válido y no lanza", async () => {
    await expect(gastarTiempoDeVerificacion("cualquiera")).resolves.toBeUndefined();
  });
});
