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
    fecha: "2026-10-19",
    titulo: {
      en: "Signing in is quicker",
      es: "Entrar es más rápido",
    },
    cambios: [
      {
        tipo: "nuevo",
        texto: {
          en: "A \"Remember my username\" switch on the sign-in page: next time your username is already filled in and the cursor goes straight to the password.",
          es: "Un interruptor \"Recordar mi usuario\" en la página de acceso: la próxima vez tu usuario ya aparece escrito y el cursor va directo a la contraseña.",
        },
      },
    ],
  },
  {
    fecha: "2026-10-18",
    titulo: {
      en: "Easier to add items, and a roomier layout",
      es: "Agregar es más fácil y el espacio se aprovecha mejor",
    },
    cambios: [
      {
        tipo: "nuevo",
        texto: {
          en: "You can now find this page from the user menu (\"What's new\") and from the home, sign-in and request-access pages.",
          es: "Ahora puedes llegar a esta página desde el menú de usuario (\"Novedades\") y desde las páginas de inicio, de acceso y de solicitud de acceso.",
        },
      },
      {
        tipo: "mejora",
        texto: {
          en: "In Settings, each person's list takes only the height of its own items instead of stretching to match the other.",
          es: "En Configuración, la lista de cada persona ocupa solo el alto de sus propios items, en vez de estirarse para igualar a la otra.",
        },
      },
      {
        tipo: "ajuste",
        texto: {
          en: "In Settings, each fixed list shows its column titles in the header and the month's total at the bottom, aligned under the amounts.",
          es: "En Configuración, cada lista de fijos muestra los títulos de columna en el encabezado y el total del mes al pie, alineado bajo los montos.",
        },
      },
      {
        tipo: "mejora",
        texto: {
          en: "Fixed items are edited in a window: name, how often it is paid, the amount per payment and the days, with the monthly total and the split shown as you type. The table keeps just the monthly amount and the payment day.",
          es: "Los gastos fijos se editan en una ventana: nombre, cada cuánto se paga, el monto por pago y los días, con el total del mes y el reparto a la vista mientras escribes. La tabla deja solo el monto mensual y el día de pago.",
        },
      },
      {
        tipo: "nuevo",
        texto: {
          en: "Fixed items can be paid twice a month (for example the 15th and the end of the month). You enter the amount per payment and pick both days, and each payment gets its own calendar reminder.",
          es: "Los gastos fijos se pueden pagar dos veces al mes (por ejemplo el 15 y fin de mes). Escribes el monto por pago, eliges los dos días, y cada pago tiene su propio recordatorio en el calendario.",
        },
      },
      {
        tipo: "nuevo",
        texto: {
          en: "Adding a fixed or extra expense now opens a window with labeled fields, and the Add buttons sit at the top of each list.",
          es: "Agregar un gasto fijo o extra ahora abre una ventana con campos con etiqueta, y los botones de agregar están arriba de cada lista.",
        },
      },
      {
        tipo: "mejora",
        texto: {
          en: "Wide screens are used better: Profile and Report in two columns, and the transfers panel as a side column in Budget.",
          es: "Las pantallas anchas se aprovechan mejor: Perfil y Reporte en dos columnas, y el panel de transferencias como columna lateral en Presupuesto.",
        },
      },
      {
        tipo: "mejora",
        texto: {
          en: "Fixed expenses use one, two or three columns depending on how many people the household has.",
          es: "Los gastos fijos usan una, dos o tres columnas según cuántas personas tenga el hogar.",
        },
      },
      {
        tipo: "ajuste",
        texto: {
          en: "The Add fixed income button now lives inside the Fixed income widget.",
          es: "El botón de agregar ingreso fijo ahora está dentro del widget de ingresos fijos.",
        },
      },
      {
        tipo: "ajuste",
        texto: {
          en: "The Settings tab is now called \"Fixed Expenses\".",
          es: "La pestaña de Configuración ahora se llama \"Gastos Fijos\".",
        },
      },
    ],
  },
  {
    fecha: "2026-10-17",
    titulo: {
      en: "Notes and a paid check on extra expenses",
      es: "Notas y marca de pagado en los gastos extra",
    },
    cambios: [
      {
        tipo: "nuevo",
        texto: {
          en: "Extra expenses can have a note, and a check mark to say they were already paid or done.",
          es: "Los gastos extra pueden tener una nota y una marca para indicar que ya se pagaron o se hicieron.",
        },
      },
    ],
  },
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
          en: "Anyone can request access from the home page. Each request is reviewed before an invitation is sent.",
          es: "Cualquier persona puede pedir acceso desde la página de inicio. Cada solicitud se revisa antes de enviar la invitación.",
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
          en: "Dropdown user menu (profile, members, sign out).",
          es: "Menú de usuario desplegable (perfil, miembros, cerrar sesión).",
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
      en: "Multiple households",
      es: "Varios hogares",
    },
    cambios: [
      {
        tipo: "nuevo",
        texto: {
          en: "Email invitations and password recovery (\"Forgot password\").",
          es: "Invitaciones por correo y recuperación de contraseña (\"Olvidé mi contraseña\").",
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
