// Log of interface changes, in broad strokes, so an admin can review them
// at /cambios (public page: nothing sensitive here; no names, amounts,
// emails or IDs). Add a new entry at the TOP when making visible UI changes.
// Every text is written once per supported language.

import type { Locale } from "@/lib/i18n/config";

export type CambioTipo = "nuevo" | "mejora" | "ajuste";

type Texto = Record<Locale, string>;

export type Cambio = {
  tipo: CambioTipo;
  texto: Texto;
};

export type EntradaChangelog = {
  fecha: string; // YYYY-MM-DD
  titulo: Texto;
  cambios: Cambio[];
};

export const CHANGELOG: EntradaChangelog[] = [
  {
    fecha: "2026-10-16",
    titulo: {
      en: "New home page and access requests",
      es: "Nueva página de inicio y solicitudes de acceso",
    },
    cambios: [
      {
        tipo: "nuevo",
        texto: {
          en: "A public home page that explains what Budget Plus is and how to get started, instead of going straight to the sign-in.",
          es: "Una página de inicio pública que explica qué es Budget Plus y cómo empezar, en vez de ir directo al inicio de sesión.",
        },
      },
      {
        tipo: "nuevo",
        texto: {
          en: "Anyone can request access from the home page. Requests are reviewed by an administrator, who can correct the details and accept or deny before the invitation is sent.",
          es: "Cualquier persona puede pedir acceso desde la página de inicio. Un administrador revisa las solicitudes, puede corregir los datos y aceptar o rechazar antes de enviar la invitación.",
        },
      },
    ],
  },
  {
    fecha: "2026-10-15",
    titulo: {
      en: "English and Spanish, and your own Google Calendar",
      es: "Inglés y español, y tu propio Google Calendar",
    },
    cambios: [
      {
        tipo: "nuevo",
        texto: {
          en: "Each household can connect its own Google Calendar from Profile → Calendar, so payment reminders land in your own calendar.",
          es: "Cada hogar puede conectar su propio Google Calendar desde Perfil → Calendario, para que los recordatorios de pago lleguen a tu propio calendario.",
        },
      },
      {
        tipo: "mejora",
        texto: {
          en: "You can change your connected Google Calendar at any time; your payment reminders move to the new calendar.",
          es: "Puedes cambiar tu Google Calendar conectado cuando quieras; tus recordatorios de pago se mueven al nuevo calendario.",
        },
      },
      {
        tipo: "nuevo",
        texto: {
          en: "The whole app is available in English and Spanish. Switch language (EN | ES) from your Profile, or from the sign-in and changes pages.",
          es: "Toda la app está disponible en inglés y español. Cambia el idioma (EN | ES) desde tu Perfil, o desde las páginas de acceso y de cambios.",
        },
      },
      {
        tipo: "mejora",
        texto: {
          en: "Your language is saved to your account, so it follows you to any device and browser after you sign in.",
          es: "Tu idioma se guarda en tu cuenta, así que te sigue a cualquier dispositivo y navegador al iniciar sesión.",
        },
      },
      {
        tipo: "mejora",
        texto: {
          en: "Invitation and password reset emails are sent in the language of the person who triggers them.",
          es: "Los correos de invitación y de recuperación de contraseña salen en el idioma de quien los dispara.",
        },
      },
      {
        tipo: "ajuste",
        texto: {
          en: "In Budget, the variable section is now called \"Extra expenses this month\".",
          es: "En Presupuesto, la sección de variables ahora se llama \"Gastos extra este mes\".",
        },
      },
    ],
  },
  {
    fecha: "2026-10-14",
    titulo: {
      en: "Changes page and safer sign-in",
      es: "Página de cambios y acceso más seguro",
    },
    cambios: [
      {
        tipo: "nuevo",
        texto: {
          en: "This page (/cambios): a public summary of interface changes, no sign-in required.",
          es: "Esta página (/cambios): resumen público de los cambios de interfaz, sin necesidad de iniciar sesión.",
        },
      },
      {
        tipo: "mejora",
        texto: {
          en: "Sign-in accepts email or username, and limits failed attempts.",
          es: "El inicio de sesión acepta correo o nombre de usuario, y limita los intentos fallidos.",
        },
      },
    ],
  },
  {
    fecha: "2026-10-13",
    titulo: {
      en: "User menu, profile and annual report",
      es: "Menú de usuario, perfil y reporte anual",
    },
    cambios: [
      {
        tipo: "nuevo",
        texto: {
          en: "Annual report (\"Year summary\") with a savings flag per category.",
          es: "Reporte anual (\"Resumen del año\") con marca de ahorro por categoría.",
        },
      },
      {
        tipo: "nuevo",
        texto: {
          en: "Profile page: change your name and password from the app.",
          es: "Página de perfil: cambiar nombre y contraseña desde la app.",
        },
      },
      {
        tipo: "mejora",
        texto: {
          en: "Dropdown user menu (profile, members/admin, sign out).",
          es: "Menú de usuario desplegable (perfil, miembros/admin, cerrar sesión).",
        },
      },
      {
        tipo: "ajuste",
        texto: {
          en: "\"Accounts and fixed expenses\" moved to the user menu; the top bar keeps Budget and Report.",
          es: "\"Cuentas y gastos fijos\" pasó al menú de usuario; la barra superior queda con Presupuesto y Reporte.",
        },
      },
    ],
  },
  {
    fecha: "2026-10-12",
    titulo: {
      en: "Multiple households and admin panel",
      es: "Varios hogares y panel de administración",
    },
    cambios: [
      {
        tipo: "nuevo",
        texto: {
          en: "Admin panel to create and manage households and members on a single screen.",
          es: "Panel Admin para crear y gestionar hogares y miembros en una sola pantalla.",
        },
      },
      {
        tipo: "nuevo",
        texto: {
          en: "Email invitations and password recovery (\"Forgot password\").",
          es: "Invitaciones por correo y recuperación de contraseña (\"Olvidé mi contraseña\").",
        },
      },
      {
        tipo: "nuevo",
        texto: {
          en: "Archive, restore and delete households, confirmed by typing the name.",
          es: "Archivar, restaurar y eliminar hogares con confirmación escribiendo el nombre.",
        },
      },
      {
        tipo: "nuevo",
        texto: {
          en: "Log of administration actions visible to the super-admin.",
          es: "Registro de acciones de administración visible para el super-admin.",
        },
      },
      {
        tipo: "mejora",
        texto: {
          en: "Per-member colors taken from a household palette.",
          es: "Colores por miembro tomados de una paleta del hogar.",
        },
      },
      {
        tipo: "mejora",
        texto: {
          en: "Clear message when there is no household and a getting-started card for empty households.",
          es: "Mensaje claro cuando no hay hogar y tarjeta de primeros pasos para hogares vacíos.",
        },
      },
    ],
  },
  {
    fecha: "2026-10-05",
    titulo: {
      en: "Variable expenses",
      es: "Gastos variables",
    },
    cambios: [
      {
        tipo: "mejora",
        texto: {
          en: "Variable expenses can have an optional account and are shown in the month's list.",
          es: "Los gastos variables pueden tener cuenta opcional y se muestran en la lista del mes.",
        },
      },
    ],
  },
  {
    fecha: "2026-09-30",
    titulo: {
      en: "Budget, transfers and fixed expenses",
      es: "Presupuesto, transferencias y gastos fijos",
    },
    cambios: [
      {
        tipo: "nuevo",
        texto: {
          en: "\"Your transfers\": a table of how much to send to each account, above the budget, full width and collapsible.",
          es: "\"Tus transferencias\": tabla de cuánto enviar a cada cuenta, arriba del presupuesto, a todo el ancho y plegable.",
        },
      },
      {
        tipo: "nuevo",
        texto: {
          en: "Budget with two months side by side, payment dates and a compact layout.",
          es: "Presupuesto con dos meses lado a lado, fechas de pago y diseño compacto.",
        },
      },
      {
        tipo: "nuevo",
        texto: {
          en: "Payment reminders synced with a shared calendar.",
          es: "Recordatorios de pagos sincronizados con un calendario compartido.",
        },
      },
      {
        tipo: "mejora",
        texto: {
          en: "Settings split into tabs (Fixed and My accounts), with income first and groups by person color.",
          es: "Configuración dividida en pestañas (Fijos y Mis cuentas), con ingresos primero y grupos por color de persona.",
        },
      },
    ],
  },
];
