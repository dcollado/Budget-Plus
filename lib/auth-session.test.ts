import { beforeAll, describe, expect, it } from "vitest";

// La clave de firma sale del entorno; en pruebas se fija una cualquiera.
beforeAll(() => {
  process.env.SESSION_SECRET = "clave-de-prueba-solo-para-tests";
});

async function sesion() {
  return import("./auth-session");
}

describe("duración de la sesión", () => {
  it("la sesión normal dura 8 horas", async () => {
    const { createSessionToken, verifySessionToken, SESION_CORTA_SEGUNDOS } = await sesion();
    const antes = Date.now();
    const payload = await verifySessionToken(await createSessionToken("u1", "ana", 0));

    expect(payload).not.toBeNull();
    expect(payload!.larga).toBeUndefined();
    expect(payload!.expiresAt - antes).toBeGreaterThanOrEqual(SESION_CORTA_SEGUNDOS * 1000 - 1000);
    expect(payload!.expiresAt - antes).toBeLessThanOrEqual(SESION_CORTA_SEGUNDOS * 1000 + 5000);
  });

  it("con \"mantener sesión iniciada\" dura 30 días y lo recuerda", async () => {
    const { createSessionToken, verifySessionToken, SESION_LARGA_SEGUNDOS } = await sesion();
    const antes = Date.now();
    const payload = await verifySessionToken(await createSessionToken("u1", "ana", 3, true));

    expect(payload).not.toBeNull();
    expect(payload!.larga).toBe(true);
    expect(payload!.sv).toBe(3);
    expect(payload!.expiresAt - antes).toBeGreaterThanOrEqual(SESION_LARGA_SEGUNDOS * 1000 - 1000);
  });

  it("duracionSesionSegundos elige entre corta y larga", async () => {
    const { duracionSesionSegundos, SESION_CORTA_SEGUNDOS, SESION_LARGA_SEGUNDOS } = await sesion();

    expect(duracionSesionSegundos(false)).toBe(SESION_CORTA_SEGUNDOS);
    expect(duracionSesionSegundos(true)).toBe(SESION_LARGA_SEGUNDOS);
    expect(SESION_LARGA_SEGUNDOS).toBeGreaterThan(SESION_CORTA_SEGUNDOS);
  });

  it("rechaza un token alterado (no se puede alargar a mano)", async () => {
    const { createSessionToken, verifySessionToken } = await sesion();
    const token = await createSessionToken("u1", "ana", 0);
    const [payload, firma] = token.split(".");

    // Cambia el contenido (por ejemplo para marcarlo como larga) sin volver a firmar.
    const alterado = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    alterado.larga = true;
    alterado.expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000;
    const falso = `${Buffer.from(JSON.stringify(alterado)).toString("base64url")}.${firma}`;

    expect(await verifySessionToken(falso)).toBeNull();
  });
});
