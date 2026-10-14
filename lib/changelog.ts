// Registro de cambios de interfaz, a grandes rasgos, para que un admin pueda
// revisarlos en /cambios (página pública: nada sensible aquí; sin nombres,
// montos, correos ni IDs). Se agrega una entrada nueva ARRIBA al hacer
// cambios visibles de UI.

export type CambioTipo = "nuevo" | "mejora" | "ajuste";

export type Cambio = {
  tipo: CambioTipo;
  texto: string;
};

export type EntradaChangelog = {
  fecha: string; // YYYY-MM-DD
  titulo: string;
  cambios: Cambio[];
};

export const CHANGELOG: EntradaChangelog[] = [
  {
    fecha: "2026-10-14",
    titulo: "Página de cambios y acceso más seguro",
    cambios: [
      {
        tipo: "nuevo",
        texto:
          "Esta página (/cambios): resumen público de los cambios de interfaz, sin necesidad de iniciar sesión.",
      },
      {
        tipo: "mejora",
        texto:
          "El inicio de sesión acepta correo o nombre de usuario, y limita los intentos fallidos.",
      },
    ],
  },
  {
    fecha: "2026-10-13",
    titulo: "Menú de usuario, perfil y reporte anual",
    cambios: [
      {
        tipo: "nuevo",
        texto:
          "Reporte anual (\"Resumen del año\") con marca de ahorro por categoría.",
      },
      {
        tipo: "nuevo",
        texto:
          "Página de perfil: cambiar nombre y contraseña desde la app.",
      },
      {
        tipo: "mejora",
        texto:
          "Menú de usuario desplegable (perfil, miembros/admin, cerrar sesión).",
      },
      {
        tipo: "ajuste",
        texto:
          "\"Cuentas y gastos fijos\" pasó al menú de usuario; la barra superior queda con Presupuesto y Reporte.",
      },
    ],
  },
  {
    fecha: "2026-10-12",
    titulo: "Varios hogares y panel de administración",
    cambios: [
      {
        tipo: "nuevo",
        texto:
          "Panel Admin para crear y gestionar hogares y miembros en una sola pantalla.",
      },
      {
        tipo: "nuevo",
        texto:
          "Invitaciones por correo y recuperación de contraseña (\"Olvidé mi contraseña\").",
      },
      {
        tipo: "nuevo",
        texto:
          "Archivar, restaurar y eliminar hogares con confirmación escribiendo el nombre.",
      },
      {
        tipo: "nuevo",
        texto: "Registro de acciones de administración visible para el super-admin.",
      },
      {
        tipo: "mejora",
        texto:
          "Colores por miembro tomados de una paleta del hogar.",
      },
      {
        tipo: "mejora",
        texto:
          "Mensaje claro cuando no hay hogar y tarjeta de primeros pasos para hogares vacíos.",
      },
    ],
  },
  {
    fecha: "2026-10-05",
    titulo: "Gastos variables",
    cambios: [
      {
        tipo: "mejora",
        texto:
          "Los gastos variables pueden tener cuenta opcional y se muestran en la lista del mes.",
      },
    ],
  },
  {
    fecha: "2026-09-30",
    titulo: "Presupuesto, transferencias y gastos fijos",
    cambios: [
      {
        tipo: "nuevo",
        texto:
          "\"Tus transferencias\": tabla de cuánto enviar a cada cuenta, arriba del presupuesto, a todo el ancho y plegable.",
      },
      {
        tipo: "nuevo",
        texto:
          "Presupuesto con dos meses lado a lado, fechas de pago y diseño compacto.",
      },
      {
        tipo: "nuevo",
        texto: "Recordatorios de pagos sincronizados con un calendario compartido.",
      },
      {
        tipo: "mejora",
        texto:
          "Configuración dividida en pestañas (Fijos y Mis cuentas), con ingresos primero y grupos por color de persona.",
      },
    ],
  },
];
