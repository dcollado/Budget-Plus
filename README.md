# Sincronización de ítems fijos con el dashboard

## Cambio en Google Sheets

En la hoja `Movimientos`, agrega una nueva columna al final:

| Columna | Encabezado |
|---|---|
| M | `itemFijoId` |

No muevas ni renombres las columnas A-L.

La estructura queda:

```text
A id
B fecha
C tipo
D origen
E monto
F categoria
G descripcion
H mes
I anio
J numeroFactura
K ruc
L notas
M itemFijoId
```

## Archivos que debes reemplazar

```text
lib/movimientos-store.ts
app/api/movimientos/route.ts
app/api/items-fijos/route.ts
```

## Comportamiento nuevo

- Crear un ítem fijo activo:
  - se guarda en `ItemsFijos`;
  - si el mes actual ya fue generado, crea inmediatamente su movimiento;
  - el dashboard lo mostrará al volver o refrescar.

- Editar un ítem fijo:
  - actualiza el movimiento del mes actual.

- Desactivar un ítem fijo:
  - elimina su movimiento del mes actual;
  - no toca movimientos históricos.

- Reactivar un ítem fijo:
  - vuelve a crear su movimiento del mes actual.

- Eliminar un ítem fijo:
  - elimina el movimiento asociado del mes actual;
  - conserva meses anteriores.

## Importante sobre movimientos ya existentes

Los movimientos fijos generados antes de este cambio tendrán vacía la columna
`itemFijoId`. No se dañan y siguen apareciendo en el dashboard, pero no quedan
vinculados retroactivamente.

Para probar la nueva vinculación, crea un ítem fijo nuevo después de instalar
estos archivos. Ese movimiento sí tendrá su ID en la columna M.

## Pruebas

```bash
npm run build
npm run dev
```

Prueba:

1. Abre el dashboard para asegurar que el mes actual esté generado.
2. Crea un ítem fijo activo.
3. Regresa al dashboard y refresca.
4. Edita su monto.
5. Verifica que el movimiento cambie y no se duplique.
6. Desactívalo.
7. Verifica que desaparezca del mes actual.
8. Reactívalo.
9. Verifica que reaparezca una sola vez.
