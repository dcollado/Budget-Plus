import { beforeAll, describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";

beforeAll(() => {
  process.env.SESSION_SECRET = "clave-de-prueba-solo-para-tests";
});

// Petición mínima: solo se leen cookies y cabeceras.
function peticion(opciones: { cookie?: string; headers?: Record<string, string> }): NextRequest {
  return {
    cookies: { get: () => (opciones.cookie ? { value: opciones.cookie } : undefined) },
    headers: new Headers(opciones.headers),
  } as unknown as NextRequest;
}

describe("identidad de la petición", () => {
  it("una cabecera x-usuario-id falsificada, sin cookie, no da identidad", async () => {
    const { getIdentidad } = await import("./current-user");
    const req = peticion({ headers: { "x-usuario-id": "victima", "x-usuario-nombre": "victima" } });

    expect(await getIdentidad(req)).toBeNull();
  });

  it("una cookie firmada válida da la identidad, ignorando cabeceras", async () => {
    const { getIdentidad } = await import("./current-user");
    const { createSessionToken } = await import("./auth-session");
    const token = await createSessionToken("u1", "ana", 0);
    const req = peticion({ cookie: token, headers: { "x-usuario-id": "otro" } });

    expect(await getIdentidad(req)).toEqual({ usuarioId: "u1", nombre: "ana" });
  });

  it("una cookie con la firma alterada no da identidad", async () => {
    const { getIdentidad } = await import("./current-user");
    const { createSessionToken } = await import("./auth-session");
    const [payload] = (await createSessionToken("u1", "ana", 0)).split(".");
    const req = peticion({ cookie: `${payload}.firmafalsa` });

    expect(await getIdentidad(req)).toBeNull();
  });

  it("una cookie con el contenido cambiado (otro usuario) no da identidad", async () => {
    const { getIdentidad } = await import("./current-user");
    const { createSessionToken } = await import("./auth-session");
    const [, firma] = (await createSessionToken("u1", "ana", 0)).split(".");
    const otro = Buffer.from(
      JSON.stringify({ usuarioId: "admin", username: "admin", expiresAt: Date.now() + 1e9 })
    ).toString("base64url");
    const req = peticion({ cookie: `${otro}.${firma}` });

    expect(await getIdentidad(req)).toBeNull();
  });
});
