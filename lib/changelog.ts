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
    fecha: "2026-10-20",
    titulo: {
      en: "A guide inside the app",
      es: "Una guía dentro de la app",
    },
    cambios: [
      {
        tipo: "ajuste",
        texto: {
          en: "Projects no longer have a Target budget: it was only a reference and did not help the calculation.",
          es: "Los proyectos ya no tienen Presupuesto objetivo: era solo una referencia y no ayudaba al cálculo.",
        },
      },
      {
        tipo: "nuevo",
        texto: {
          en: "Fixed income can now be paid every 2 weeks: you pick a recent payday and the app counts every 14 days from it.",
          es: "Los ingresos fijos ahora pueden cobrarse cada 2 semanas: eliges un día de pago reciente y la app cuenta cada 14 días desde ahí.",
        },
      },
      {
        tipo: "mejora",
        texto: {
          en: "In Projects, the month of the last payment now counts only what comes in and goes out until that date, using the real paydays, instead of simply half the month.",
          es: "En Proyectos, el mes del último pago ahora cuenta solo lo que entra y sale hasta esa fecha, con los días de cobro reales, en vez de simplemente la mitad del mes.",
        },
      },
      {
        tipo: "nuevo",
        texto: {
          en: "In Projects, when you mark an item as paid outside your saved money, you choose who paid and when, and it is recorded in Budget as that person's expense, so what they have free that month goes down. Items already paid have a Record the expense button.",
          es: "En Proyectos, al marcar un gasto como pagado por fuera de lo apartado, eliges quién pagó y cuándo, y se registra en Presupuesto como gasto de esa persona, así que baja lo que tiene libre ese mes. Los gastos ya pagados tienen un botón Registrar el gasto.",
        },
      },
      {
        tipo: "mejora",
        texto: {
          en: "Budget now shows each month's suggested saving for your projects (marked Suggested, with a Confirm button). It does not count in the totals until it is confirmed.",
          es: "Presupuesto ahora muestra el ahorro sugerido de cada mes para tus proyectos (marcado Sugerido, con botón Confirmar). No cuenta en los totales hasta que se confirma.",
        },
      },
      {
        tipo: "mejora",
        texto: {
          en: "In Projects and Budget you can now edit the other person's contribution to a project, or tick it as done, just like the rest of the budget.",
          es: "En Proyectos y Presupuesto ahora puedes editar el aporte de la otra persona a un proyecto, o marcarlo como hecho, igual que el resto del presupuesto.",
        },
      },
      {
        tipo: "mejora",
        texto: {
          en: "Projects now use the first half of the month of the last payment: if a trip is on December 26th, half of December's free money counts for saving.",
          es: "Los proyectos ahora usan la primera quincena del mes del último pago: si el viaje es el 26 de diciembre, la mitad de lo libre de diciembre cuenta para apartar.",
        },
      },
      {
        tipo: "nuevo",
        texto: {
          en: "New Guide page that explains how each part of the app works (Budget, Accounts and fixed expenses, Projects, Reports…), in English and Spanish. Open it with the ? icon at the top, which takes you to the section of the screen you are on, or from your name menu.",
          es: "Nueva página de Guía que explica cómo funciona cada parte de la app (Presupuesto, Cuentas y gastos fijos, Proyectos, Reportes…), en español e inglés. Ábrela con el ícono ? de arriba, que te lleva a la sección de la pantalla donde estás, o desde el menú de tu nombre.",
        },
      },
      {
        tipo: "nuevo",
        texto: {
          en: "When something new is released you get a special notification in the bell, plus a notice at the top once you sign in. Close it or open the news and it is marked as read.",
          es: "Cuando se lanza algo nuevo recibes una notificación especial en la campana, y un aviso arriba al entrar. Ciérralo o abre la novedad y queda como leído.",
        },
      },
      {
        tipo: "ajuste",
        texto: {
          en: "The main menu is now ordered Budget, Projects, Reports.",
          es: "El menú principal ahora va en este orden: Presupuesto, Proyectos, Reportes.",
        },
      },
    ],
  },
  {
    fecha: "2026-10-20",
    titulo: {
      en: "Projects for big expenses",
      es: "Proyectos para gastos grandes",
    },
    cambios: [
      {
        tipo: "nuevo",
        texto: {
          en: "New Projects page for big expenses like a trip: list what you have to pay with its price and date, and see the minimum you need to save each month (and every two weeks) to pay everything on time. You can also set a target budget as a reference. Each person gets a suggested amount for every month, higher in the months with more room and following the payment dates (based on income, including extra income, minus fixed and extra expenses, as budgeted), and can accept it with one click or change it. Each month also shows what the other person sets aside (amounts only). The plan is month by month: for each month you see what you have free and set how much you set aside (up to what you have free that month, so a bonus in one month lets you set aside more then), and you mark it as done when you do; what is marked as done counts as saved. The minimum you need to reach the goal sits at the top of that section, and when you mark an item as paid you choose whether it was paid with the saved money or outside. In Budget, what each person sets aside for a project shows up every month as a read-only line (with a checkbox for the person who contributes), counts in the monthly totals, and marking it updates the project. You can edit, archive (and restore) or delete a project, and paid items are taken out of what you have saved.",
          es: "Nueva página de Proyectos para gastos grandes, como un viaje: anota lo que hay que pagar con su precio y fecha, y mira el mínimo que necesitas ahorrar cada mes (y cada quincena) para pagar todo a tiempo. También puedes poner un presupuesto objetivo como referencia. A cada persona se le sugiere un monto para cada mes, más alto en los meses con más holgura y siguiendo las fechas de pago (según ingresos, incluidos los extra, menos gastos fijos y extra, tal como los presupuestó), y puede aceptarlo con un clic o cambiarlo. Cada mes también muestra lo que aparta la otra persona (solo los montos). El plan es mes a mes: de cada mes ves lo que tienes libre y defines cuánto apartas (hasta lo que te queda libre ese mes, así que un décimo en un mes te deja apartar más ese mes), y lo marcas como hecho cuando lo haces; lo marcado como hecho cuenta como apartado. El mínimo que necesitas para llegar a la meta está arriba de esa sección, y al marcar un gasto como pagado eliges si se pagó con lo apartado o por fuera. En Presupuesto, lo que cada persona aparta para un proyecto aparece cada mes como una línea de solo lectura (con casilla para quien aporta), cuenta en los totales del mes y al marcarla se actualiza el proyecto. Puedes editar, archivar (y restaurar) o eliminar un proyecto, y lo ya pagado se descuenta de lo que llevas apartado.",
        },
      },
      {
        tipo: "mejora",
        texto: {
          en: "In Budget, you can now change who an extra expense or income belongs to (joint, or one person) from its edit panel, and extra items show their owner.",
          es: "En Presupuesto, ahora puedes cambiar de quién es un gasto o ingreso extra (conjunto o de una persona) desde su panel de edición, y los extras muestran su dueño.",
        },
      },
    ],
  },
  {
    fecha: "2026-10-20",
    titulo: {
      en: "Payment reminders",
      es: "Recordatorios de pago",
    },
    cambios: [
      {
        tipo: "mejora",
        texto: {
          en: "Your transfers: when you open an account, each fixed item now shows its biweekly amount next to the monthly one.",
          es: "Tus transferencias: al abrir una cuenta, cada gasto fijo ahora muestra también su monto quincenal junto al mensual.",
        },
      },
      {
        tipo: "nuevo",
        texto: {
          en: "Price increases: when you change the amount of a fixed item, you choose when it starts: right away (to fix a mistake) or from any of the next 3 months, so the current month stays as it is.",
          es: "Aumentos de precio: al cambiar el monto de un gasto o ingreso fijo, eliges desde cuándo aplica: desde ya (para corregir un error) o desde cualquiera de los próximos 3 meses, y el mes actual se queda como está.",
        },
      },
      {
        tipo: "nuevo",
        texto: {
          en: "New notifications bell: it tells you when a payment in your budget is due today or tomorrow, based on the payment day you set.",
          es: "Nueva campana de notificaciones: te avisa cuando un pago de tu presupuesto vence hoy o mañana, según el día de pago que configuraste.",
        },
      },
      {
        tipo: "mejora",
        texto: {
          en: "Error messages are easier to read: the red text is lighter and stands out better on dark backgrounds.",
          es: "Los mensajes de error se leen mejor: el texto rojo es más claro y destaca más sobre el fondo oscuro.",
        },
      },
      {
        tipo: "mejora",
        texto: {
          en: "The month picker in Budget now shows when it is selected with the keyboard, and animations are skipped if your device is set to reduce motion.",
          es: "El selector de mes en Presupuesto ahora se nota cuando lo seleccionas con el teclado, y se omiten las animaciones si tu dispositivo está configurado para reducir el movimiento.",
        },
      },
      {
        tipo: "ajuste",
        texto: {
          en: "On the home page, the header on phones is tidier: the logo, language switch and “Sign in” button now fit on a single line.",
          es: "En la página de inicio, el encabezado en el celular se ve más ordenado: el logo, el idioma y el botón «Iniciar sesión» ahora caben en una sola línea.",
        },
      },
      {
        tipo: "nuevo",
        texto: {
          en: "The What's new page now has a Back button that takes you to the screen you came from.",
          es: "La página de Novedades ahora tiene un botón Volver que te lleva a la pantalla de donde venías.",
        },
      },
      {
        tipo: "ajuste",
        texto: {
          en: "The Reports page now fits your phone screen: nothing is cut off on the right, and the menu item is now called “Reports”.",
          es: "La página de Reportes ahora cabe en la pantalla del celular: nada se corta a la derecha, y la opción del menú ahora se llama «Reportes».",
        },
      },
      {
        tipo: "mejora",
        texto: {
          en: "Small labels and captions are now a bit larger, so they are easier to read on your phone.",
          es: "Las etiquetas y textos pequeños ahora son un poco más grandes, para leerlos mejor en el celular.",
        },
      },
      {
        tipo: "mejora",
        texto: {
          en: "Pop-up windows work better with the keyboard: Tab stays inside the window and, when you close it, you go back to where you were.",
          es: "Las ventanas emergentes funcionan mejor con el teclado: Tab se queda dentro de la ventana y, al cerrarla, vuelves a donde estabas.",
        },
      },
      {
        tipo: "ajuste",
        texto: {
          en: "If something goes wrong, you now see a friendly screen with a retry button instead of a blank page.",
          es: "Si algo sale mal, ahora ves una pantalla amable con un botón para reintentar en vez de una página en blanco.",
        },
      },
    ],
  },
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
          en: "A \"Remember username\" switch on the sign-in page: your username is filled in next time and you stay signed in on that device. You only sign in again after 30 days without visiting.",
          es: "Un interruptor \"Recordar usuario\" en la página de acceso: tu usuario aparece escrito la próxima vez y tu sesión sigue iniciada en ese dispositivo. Solo vuelves a entrar si pasan 30 días sin visitar.",
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
