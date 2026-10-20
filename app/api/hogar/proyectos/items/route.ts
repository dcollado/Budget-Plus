import { moduloApagado } from "@/lib/modulos-datos";
import { after, NextRequest } from "next/server";
import { exito, fallo } from "@/lib/api";
import { requerirHogar } from "@/lib/household/contexto";
import {
  actualizarProyectoItem,
  crearProyectoItem,
  eliminarProyectoItem,
  listMembers,
  listProyectoItems,
  listProyectos,
} from "@/lib/household/datos";
import { sincronizarDosMeses, sincronizarSinFallar } from "@/lib/household/calendario";
import {
  ajustarGastoDelItem,
  registrarGastoDelItem,
  retirarGastoDelItem,
} from "@/lib/household/proyectos-pagos";
import { fechaEnPanama } from "@/lib/notificaciones";
import { centavosDe, fechaValida } from "@/lib/validacion";

const MAX_CONCEPTO = 120;

export async function POST(req: NextRequest) {
  try {
    const r = await requerirHogar(req);
    if (!r.ok) return r.response;
    const apagado = await moduloApagado("proyectos");
    if (apagado) return apagado;
    const { contexto } = r;

    const body = (await req.json()) as Record<string, unknown>;
    const projectId = String(body.projectId ?? "").trim();
    const concepto = String(body.concepto ?? "").trim();
    const montoCents = centavosDe(body.monto);
    // Vacío = sin fecha (rige la del proyecto).
    const fecha = String(body.fecha ?? "").trim();

    if (!concepto || concepto.length > MAX_CONCEPTO) {
      return fallo("The item name is missing.", 400);
    }

    if (montoCents === null) {
      return fallo("The amount is not valid.", 400);
    }

    if (montoCents <= 0) {
      return fallo("The amount must be greater than zero.", 400);
    }

    if (fecha && !fechaValida(fecha)) {
      return fallo("Pick a valid target date.", 400);
    }

    const proyectos = await listProyectos(contexto.householdId);

    if (!proyectos.some((p) => p.id === projectId)) {
      return fallo("That project is not part of this household.", 404);
    }

    const item = await crearProyectoItem({
      projectId,
      householdId: contexto.householdId,
      concepto,
      montoCents,
      fecha,
    });

    return exito(item);
  } catch (error) {
    console.error("Error creating project item:", error);
    return fallo("Could not save the project.", 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const r = await requerirHogar(req);
    if (!r.ok) return r.response;
    const apagado = await moduloApagado("proyectos");
    if (apagado) return apagado;
    const { contexto } = r;

    const body = (await req.json()) as Record<string, unknown>;
    const id = String(body.id ?? "").trim();

    if (!id) {
      return fallo("Project is missing.", 400);
    }

    const cambios: Parameters<typeof actualizarProyectoItem>[2] = {};

    if (body.concepto !== undefined) {
      const concepto = String(body.concepto).trim();
      if (!concepto || concepto.length > MAX_CONCEPTO) {
        return fallo("The item name is missing.", 400);
      }
      cambios.concepto = concepto;
    }

    if (body.monto !== undefined) {
      const cents = centavosDe(body.monto);
      if (cents === null) return fallo("The amount is not valid.", 400);
      if (cents <= 0) return fallo("The amount must be greater than zero.", 400);
      cambios.montoCents = cents;
    }

    if (body.fecha !== undefined) {
      const fecha = String(body.fecha ?? "").trim();
      if (fecha && !fechaValida(fecha)) return fallo("Pick a valid target date.", 400);
      cambios.fecha = fecha;
    }

    if (body.pagado !== undefined) {
      cambios.pagado = body.pagado === true;
      // Al desmarcarlo, deja de contar como pagado con lo apartado.
      if (!cambios.pagado) cambios.pagadoConApartado = false;
    }

    if (body.pagadoConApartado !== undefined && cambios.pagado !== false) {
      cambios.pagadoConApartado = body.pagadoConApartado === true;
    }

    const householdId = contexto.householdId;
    const actual = (await listProyectoItems(householdId)).find((i) => i.id === id);

    if (!actual) {
      return fallo("That project is not part of this household.", 404);
    }

    // ---- el pago por fuera se refleja como gasto extra de quien lo pagó
    const pagado = cambios.pagado ?? actual.pagado;
    const conApartado = cambios.pagadoConApartado ?? actual.pagadoConApartado;
    const porFuera = pagado && !conApartado;
    const pidioRegistrar = body.registrarGasto === true;
    const mesesASincronizar: string[] = [];

    if (porFuera && (pidioRegistrar || (body.pagado === true && body.registrarGasto !== false))) {
      const pagadoPor = String(body.pagadoPor ?? "").trim();
      const fechaPago = String(body.pagadoFecha ?? "").trim() || fechaEnPanama();

      if (!fechaValida(fechaPago)) return fallo("Pick a valid payment date.", 400);

      if (pagadoPor) {
        const miembros = await listMembers(householdId);
        if (!miembros.some((m) => m.id === pagadoPor)) {
          return fallo("That member is not part of this household.", 400);
        }
      }

      const proyecto = (await listProyectos(householdId)).find((p) => p.id === actual.projectId);
      const monto = cambios.montoCents ?? actual.montoCents;

      // Si ya había un gasto registrado, se rehace con los datos nuevos.
      await retirarGastoDelItem(householdId, actual.gastoCategoriaId);
      if (actual.pagadoFecha) mesesASincronizar.push(actual.pagadoFecha.slice(0, 7));

      cambios.gastoCategoriaId = await registrarGastoDelItem({
        householdId,
        proyecto: proyecto?.name ?? "",
        concepto: cambios.concepto ?? actual.concepto,
        montoCents: monto,
        pagadoPor,
        fecha: fechaPago,
      });
      cambios.pagadoPor = pagadoPor;
      cambios.pagadoFecha = fechaPago;
      mesesASincronizar.push(fechaPago.slice(0, 7));
    } else if (!porFuera && actual.gastoCategoriaId) {
      // Se desmarcó o pasó a pagarse con lo apartado: ese gasto extra ya no existe.
      await retirarGastoDelItem(householdId, actual.gastoCategoriaId);
      if (actual.pagadoFecha) mesesASincronizar.push(actual.pagadoFecha.slice(0, 7));
      cambios.gastoCategoriaId = "";
      cambios.pagadoPor = "";
      cambios.pagadoFecha = "";
    } else if (porFuera && actual.gastoCategoriaId && cambios.montoCents !== undefined) {
      await ajustarGastoDelItem(householdId, actual.gastoCategoriaId, actual.pagadoFecha, cambios.montoCents);
      mesesASincronizar.push(actual.pagadoFecha.slice(0, 7));
    }

    const item = await actualizarProyectoItem(householdId, id, cambios);

    if (!item) {
      return fallo("That project is not part of this household.", 404);
    }

    for (const mes of new Set(mesesASincronizar)) {
      after(() => sincronizarSinFallar(() => sincronizarDosMeses(householdId, mes)));
    }

    return exito(item);
  } catch (error) {
    console.error("Error updating project item:", error);
    return fallo("Could not save the project.", 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const r = await requerirHogar(req);
    if (!r.ok) return r.response;
    const apagado = await moduloApagado("proyectos");
    if (apagado) return apagado;
    const { contexto } = r;

    const id = req.nextUrl.searchParams.get("id")?.trim() ?? "";

    if (!id) {
      return fallo("Project is missing.", 400);
    }

    // Si el ítem tenía un gasto extra registrado, se retira con él.
    const actual = (await listProyectoItems(contexto.householdId)).find((i) => i.id === id);
    if (actual?.gastoCategoriaId) {
      await retirarGastoDelItem(contexto.householdId, actual.gastoCategoriaId);
    }

    const borrado = await eliminarProyectoItem(contexto.householdId, id);

    if (!borrado) {
      return fallo("That project is not part of this household.", 404);
    }

    return exito({ id });
  } catch (error) {
    console.error("Error deleting project item:", error);
    return fallo("Could not delete the item.", 500);
  }
}
