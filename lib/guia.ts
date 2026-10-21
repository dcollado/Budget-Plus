// Contenido de la guía (/guia), una vez por idioma. Cada sección tiene un id
// que sirve de ancla (/guia#proyectos): el ícono "?" del encabezado lleva a la
// sección de la pantalla donde estás. Los textos admiten **negrita**.
// Si cambia cómo funciona una pantalla, se actualiza aquí.

import type { Locale } from "@/lib/i18n/config";

type Texto = Record<Locale, string>;

export type SeccionGuia = {
  id: string;
  titulo: Texto;
  intro: Texto;
  puntos: Record<Locale, string[]>;
};

export const GUIA: SeccionGuia[] = [
  {
    id: "empezar",
    titulo: { en: "How it works in one minute", es: "Cómo funciona en un minuto" },
    intro: {
      en: "Budget Plus is a shared budget for a household. It works with what you plan, not with what you spend.",
      es: "Budget Plus es un presupuesto compartido para un hogar. Trabaja con lo que planeas, no con lo que gastas.",
    },
    puntos: {
      en: [
        "**Fixed income and expenses** (salary, rent, utilities) are entered once in Accounts and fixed expenses. They carry over to the following months by themselves.",
        "**Each month** you add the extras that come up (a one-off expense or income) in Budget.",
        "**Budget** shows, month by month, what comes in, what goes out and what is **left to spend**.",
        "**Projects** are for big expenses (a trip, a renovation): you list what you have to pay and the app tells you how much to set aside each month.",
        "**Reports** give you the year at a glance.",
        "Every item belongs to a person or is **Joint** (no owner). The owner decides whose money it counts against.",
      ],
      es: [
        "Los **ingresos y gastos fijos** (sueldo, renta, luz) se cargan una sola vez en Cuentas y gastos fijos. Pasan solos a los meses siguientes.",
        "**Cada mes** agregas en Presupuesto los extras que salgan (un gasto o un ingreso puntual).",
        "**Presupuesto** te muestra, mes a mes, lo que entra, lo que sale y **lo que te queda por gastar**.",
        "**Proyectos** sirven para gastos grandes (un viaje, una remodelación): anotas lo que hay que pagar y la app te dice cuánto apartar cada mes.",
        "**Reportes** te da el año de un vistazo.",
        "Cada ítem es de una persona o es **Conjunto** (sin dueño). El dueño define a quién le cuenta ese dinero.",
      ],
    },
  },
  {
    id: "presupuesto",
    titulo: { en: "Budget", es: "Presupuesto" },
    intro: {
      en: "Your month-by-month plan. You see the current month and the ones after it.",
      es: "Tu plan mes a mes. Ves el mes actual y los siguientes.",
    },
    puntos: {
      en: [
        "**Your transfers** (at the top) shows how much you send to each account, per month and every two weeks, from your fixed expenses. Open an account to see which expenses make it up. **Salary** and **Remainder** (what is left of your salary after your fixed expenses) are at the bottom.",
        "The **From** picker changes the first month shown.",
        "Each month has four numbers: **Income**, **Fixed expenses**, **Variable expenses** and **Left to spend**. If you set money aside for projects, **Project savings** appears too and is subtracted.",
        "**Extra expenses this month**: use **+ Variable expense** or **+ Variable income** for something that only happens this month. In the form you also choose **whose it is** (it starts as you). Tick the box when it is done, use the pencil to change the amount, date, note, account or whose it is, and the bin to delete it.",
        "**Savings for projects**: a line per person with what they set aside that month for a project. Anyone in the household can tick it as set aside (that updates the project). What is only **suggested** shows too, marked **Suggested**, with a **Confirm** button, and it does not count in the totals until it is confirmed. To change an amount, go to Projects.",
        "Fixed expenses and income are not edited here: they are in **Accounts and fixed expenses** (your name menu).",
      ],
      es: [
        "**Tus transferencias** (arriba) muestra cuánto mandas a cada cuenta, por mes y por quincena, según tus gastos fijos. Abre una cuenta para ver qué gastos la componen. Abajo están tu **Salario** y tu **Remanente** (lo que te queda del salario después de tus gastos fijos).",
        "El selector **Desde** cambia el primer mes que se muestra.",
        "Cada mes tiene cuatro números: **Ingresos**, **Gastos fijos**, **Gastos variables** y **Por gastar**. Si apartas dinero para proyectos, aparece también **Ahorro en proyectos** y se resta.",
        "**Gastos extra este mes**: con **+ Gasto variable** o **+ Ingreso variable** agregas algo que solo pasa este mes. En el formulario también eliges **de quién es** (empieza siendo tuyo). Marca la casilla cuando ya esté hecho, usa el lápiz para cambiar el monto, la fecha, la nota, la cuenta o de quién es, y la papelera para eliminarlo.",
        "**Ahorro para proyectos**: una línea por persona con lo que apartó ese mes para un proyecto. Cualquiera del hogar puede marcarla como apartada (eso actualiza el proyecto). Lo que solo está **sugerido** también aparece, marcado **Sugerido**, con un botón **Confirmar**, y no cuenta en los totales hasta que se confirme. Para cambiar un monto, ve a Proyectos.",
        "Los gastos e ingresos fijos no se editan aquí: están en **Cuentas y gastos fijos** (menú de tu nombre).",
      ],
    },
  },
  {
    id: "fijos",
    titulo: { en: "Accounts and fixed expenses", es: "Cuentas y gastos fijos" },
    intro: {
      en: "Where you set up what repeats every month. You enter it once and it carries over.",
      es: "Donde configuras lo que se repite cada mes. Lo cargas una vez y se hereda.",
    },
    puntos: {
      en: [
        "**Fixed expenses** tab: fixed income (salaries) and fixed expenses (rent, utilities, subscriptions). For each one you choose the amount, the payment day, whether it is paid once a month, **twice** (two days) or, for income, **every 2 weeks** (you pick a recent payday and the app counts every 14 days from it, since some months have 3 paydays; in those months Budget and Projects count all 3 payments by themselves: the Income card says Includes a 3rd payday, and the amount you typed does not change), whose it is, which account the money goes to, and whether it counts as **savings** (for the report).",
        "**Changing an amount**: you choose **when the new amount starts**. **Right away** fixes the current month and the following ones (for a mistake). Or pick **one of the next 3 months** for a price increase you were told about in advance. Previous months do not change.",
        "**My accounts** tab: the destinations of your transfers (Joint account, Emergency fund…). Each person assigns their fixed expenses to the accounts they want, and that is what builds **Your transfers**.",
      ],
      es: [
        "Pestaña **Gastos fijos**: ingresos fijos (sueldos) y gastos fijos (renta, luz, suscripciones). De cada uno eliges el monto, el día de pago, si se paga una vez al mes, **dos veces** (dos días) o, en los ingresos, **cada 2 semanas** (eliges un día de pago reciente y la app cuenta cada 14 días desde ahí, porque algunos meses tienen 3 pagos; en esos meses Presupuesto y Proyectos cuentan los 3 pagos solos: la tarjeta de Ingresos dice Incluye un 3er pago, y el monto que escribiste no cambia), de quién es, a qué cuenta va el dinero y si cuenta como **ahorro** (para el reporte).",
        "**Cambiar un monto**: eliges **desde cuándo aplica el nuevo monto**. **Desde ya** corrige el mes actual y los siguientes (para un error). O elige **uno de los próximos 3 meses** para un aumento de precio que te avisaron con tiempo. Los meses anteriores no cambian.",
        "Pestaña **Mis cuentas**: los destinos de tus transferencias (Cuenta conjunta, Emergencias…). Cada persona asigna sus gastos fijos a las cuentas que quiera, y de ahí sale **Tus transferencias**.",
      ],
    },
  },
  {
    id: "proyectos",
    titulo: { en: "Projects", es: "Proyectos" },
    intro: {
      en: "For big expenses that need time to save for, like a trip.",
      es: "Para gastos grandes que necesitan tiempo para ahorrar, como un viaje.",
    },
    puntos: {
      en: [
        "**Switch between projects** with the tabs at the top (it remembers the one you were viewing). **Create a project** with a name, a date (the trip date or the last payment) and, optionally, **Start saving from** a future month (useful if you are already saving for another project; empty means this month). Then add **what you have to pay**: a name, an amount and, optionally, a date (without a date it uses the project date).",
        "When you tick an item as paid, you choose **how it was paid**: **with saved money** (it comes out of what you have saved) or **outside** (from your pocket or before you started, it does not touch what you saved). If it was paid outside, you also choose **who paid** and **on what date**, and it is **recorded in Budget as an expense** of that person that month, so what they have free goes down. If you undo the payment, that expense disappears. For something already paid outside, use **Record the expense**.",
        "At the top: **Committed** (what is left to pay), **Budgeted** (what you already have set aside plus what everyone plans to contribute in the coming months; compare it with Committed: it tells you if something is missing or if you are going over), **Saved** and **Left to set aside**.",
        "**Saving month by month** (a section you can fold; each month is one row and the first 4 show, with a button for the rest; tap a month's name to see its breakdown): first you see the **minimum to reach the goal** (the least you need per month to pay everything on time). Below, each month shows what **you have free** (income plus extra income, minus fixed and extra expenses, minus what you already set aside for other projects; **See breakdown** shows the detail) and, on the right, **your contribution** for that month.",
        "Each month comes with a **suggested** amount, higher in the months with more room and following the payment dates. Click **Suggested** to accept it, or type your own. **0 is valid**: it means you cannot contribute that month (for example because you already paid something from your pocket), and it only affects your own amounts, not the other person's. In general, what each person types only changes their own suggestions; what is already marked as **Done** does count for everyone, because that money is already set aside. Leave the field empty to go back to the suggestion. You can type up to what you have free that month, so a bonus in one month lets you set aside more that month.",
        "If the last payment is on the **16th or later**, the **first half of that same month** also counts for saving (in that month only what comes in and goes out **until the payment date** counts: for example a salary on the 28th does not help a payment on the 26th, so put the date of when you really spend, like the last day of the trip).",
        "Tick **Done** when you actually set the money aside: it then counts as **Saved**. Under each month you also see what the other person contributes (amounts only; their income and expenses are private), and **you can edit it or tick it as done**, just like in Budget: anyone in the household can edit the other person's contribution.",
        "The status line tells you whether what is planned **covers everything** or how much would be missing and when.",
        "What is confirmed shows up each month in **Budget** as a savings line, and what is only **suggested** also shows there (marked **Suggested**, with a **Confirm** button) without counting in the totals until it is confirmed. You can edit a project (name and date), archive it (it stays in **Archived** and can be restored) or delete it.",
      ],
      es: [
        "**Cambia entre proyectos** con las pestañas de arriba (recuerda el que estabas viendo). **Crea un proyecto** con un nombre, una fecha (la del viaje o la del último pago) y, si quieres, **Empezar a ahorrar desde** un mes futuro (útil si ya estás ahorrando para otro proyecto; vacío = este mes). Luego agrega **lo que hay que pagar**: un nombre, un monto y, si quieres, una fecha (sin fecha usa la del proyecto).",
        "Al marcar un gasto como pagado, eliges **cómo se pagó**: **con lo apartado** (sale de lo que tienes apartado) o **por fuera** (de tu bolsillo o antes de empezar, no toca lo apartado). Si fue por fuera, también eliges **quién pagó** y **en qué fecha**, y se **registra en Presupuesto como un gasto** de esa persona ese mes, así que baja lo que tiene libre. Si deshaces el pago, ese gasto desaparece. Para algo ya pagado por fuera, usa **Registrar el gasto**.",
        "Arriba ves: **Comprometido** (lo que falta pagar), **Presupuestado** (lo que ya tienen apartado más lo que todas las personas planean aportar en los meses que vienen; compáralo con Comprometido: te dice si falta algo o si se están pasando), **Apartado** y **Falta por apartar**.",
        "**Ahorro mes a mes** (una sección que puedes plegar; cada mes es una fila y se ven los primeros 4, con un botón para el resto; toca el nombre de un mes para ver su desglose): primero ves el **mínimo para llegar a la meta** (lo menos que necesitas por mes para pagar todo a tiempo). Abajo, cada mes muestra lo que **tienes libre** (ingresos más ingresos extra, menos gastos fijos y extra, menos lo que ya apartas para otros proyectos; **Ver detalle** muestra el desglose) y, a la derecha, **tu aporte** de ese mes.",
        "Cada mes trae un monto **sugerido**, más alto en los meses con más holgura y siguiendo las fechas de pago. Haz clic en **Sugerido** para aceptarlo, o escribe el tuyo. **0 es válido**: significa que ese mes no puedes aportar (por ejemplo porque ya pagaste algo de tu bolsillo), y solo afecta tus montos, no los de la otra persona. En general, lo que cada persona escribe solo cambia sus propias sugerencias; lo ya marcado como **Hecho** sí cuenta para todos, porque ese dinero ya está apartado. Deja el campo vacío para volver a la sugerencia. Puedes escribir hasta lo que tienes libre ese mes, así que un décimo en un mes te deja apartar más ese mes.",
        "Si el último pago es del **16 en adelante**, la **primera quincena de ese mismo mes** también cuenta para apartar (en ese mes solo cuenta lo que entra y sale **hasta la fecha del pago**: por ejemplo un sueldo del 28 no sirve para un pago del 26, así que pon la fecha de cuando de verdad gastas, como el último día del viaje).",
        "Marca **Hecho** cuando de verdad apartaste el dinero: entonces cuenta como **Apartado**. Debajo de cada mes también ves lo que aporta la otra persona (solo montos; sus ingresos y gastos son privados), y **puedes editarlo o marcarlo como hecho**, igual que en Presupuesto: cualquiera del hogar puede editar el aporte de la otra persona.",
        "La línea de estado te dice si lo planeado **alcanza para todo** o cuánto faltaría y para cuándo.",
        "Lo confirmado aparece cada mes en **Presupuesto** como una línea de ahorro, y lo que solo está **sugerido** también aparece ahí (marcado **Sugerido**, con botón **Confirmar**) sin contar en los totales hasta que se confirme. Puedes editar el proyecto (nombre y fecha), archivarlo (queda en **Archivados** y se puede restaurar) o eliminarlo.",
      ],
    },
  },
  {
    id: "reportes",
    titulo: { en: "Reports", es: "Reportes" },
    intro: {
      en: "The year at a glance. It comes from the household plan: what is budgeted, not what was really spent.",
      es: "El año de un vistazo. Sale del plan del hogar: lo presupuestado, no lo gastado de verdad.",
    },
    puntos: {
      en: [
        "Use **Previous year / Next year** to move between years.",
        "**Month by month** shows income, fixed and variable expenses and what is left over for each month.",
        "**By person (year)** splits the year per person. **Joint** is what has no owner assigned: it is subtracted from the household total, so it has no leftover of its own.",
        "**Savings** adds up the fixed expenses you marked as **Counts as savings** in Accounts and fixed expenses.",
      ],
      es: [
        "Usa **Año anterior / Año siguiente** para moverte entre años.",
        "**Mes por mes** muestra los ingresos, los gastos fijos y variables y el sobrante de cada mes.",
        "**Por persona (año)** reparte el año por persona. **Conjunto** es lo que no tiene dueño asignado: se resta del total del hogar, por eso no tiene sobrante propio.",
        "**Ahorro** suma los gastos fijos que marcaste como **Cuenta como ahorro** en Cuentas y gastos fijos.",
      ],
    },
  },
  {
    id: "perfil",
    titulo: { en: "Profile and security", es: "Perfil y seguridad" },
    intro: {
      en: "Your own details. Open it from your name menu.",
      es: "Tus datos. Se abre desde el menú de tu nombre.",
    },
    puntos: {
      en: [
        "Change **how you appear in the budget** (your name), see your email and your role, and choose your **language** (English or Spanish).",
        "**Change password**: needs your current password, and it closes your other open sessions.",
      ],
      es: [
        "Cambia **cómo apareces en el presupuesto** (tu nombre), mira tu correo y tu rol, y elige tu **idioma** (español o inglés).",
        "**Cambiar contraseña**: pide tu contraseña actual y cierra tus otras sesiones abiertas.",
      ],
    },
  },
  {
    id: "personas",
    titulo: { en: "People (household administrator)", es: "Personas (administrador del hogar)" },
    intro: {
      en: "Only the household administrator sees this: it is where people are invited.",
      es: "Solo lo ve el administrador del hogar: es donde se invita a las personas.",
    },
    puntos: {
      en: [
        "**Invite** someone by email: they get a link to create their password. You can **resend** or **cancel** an invitation.",
        "You can send someone a **link to change their password**, remove their access and reactivate it later.",
      ],
      es: [
        "**Invita** a alguien por correo: recibe un enlace para crear su contraseña. Puedes **reenviar** o **cancelar** una invitación.",
        "Puedes enviarle a alguien un **enlace para cambiar su contraseña**, quitarle el acceso y reactivarlo después.",
      ],
    },
  },
  {
    id: "avisos",
    titulo: { en: "Notifications and what's new", es: "Notificaciones y novedades" },
    intro: {
      en: "The app tells you what matters and what changed.",
      es: "La app te avisa lo importante y lo que cambió.",
    },
    puntos: {
      en: [
        "The **bell** warns you when a payment in your budget is due **today or tomorrow**, based on the payment day you set.",
        "**What's new** (in your name menu) lists the changes made to the app.",
      ],
      es: [
        "La **campana** te avisa cuando un pago de tu presupuesto vence **hoy o mañana**, según el día de pago que configuraste.",
        "**Novedades** (en el menú de tu nombre) lista los cambios que se le han hecho a la app.",
      ],
    },
  },
  {
    id: "preguntas",
    titulo: { en: "Common questions", es: "Preguntas frecuentes" },
    intro: {
      en: "Things people usually wonder.",
      es: "Lo que la gente suele preguntarse.",
    },
    puntos: {
      en: [
        "**Why is my \"free\" in Projects different from my \"Remainder\" in Budget?** The Remainder is your salary minus your fixed expenses. The free amount in Projects also counts your extra income and extra expenses for that month and what you already set aside for other projects.",
        "**An extra income of mine does not count in my free amount. Why?** Probably it is **Joint** (no owner). Joint items are not added to or subtracted from anyone. In Budget, use the pencil on that item and pick **Whose is it?**.",
        "**Why can't I tick another person's savings line?** Only the person who contributes can mark it as set aside.",
        "**Are the amounts what I really spent?** No: they are what you planned. That is why months ahead already have numbers.",
        "**Can I undo archiving a project?** Yes: archived projects are listed at the bottom of Projects with a **Restore** button.",
        "**How do I change the language?** In Profile and security, or with the language switch on the public pages.",
      ],
      es: [
        "**¿Por qué mi \"libre\" en Proyectos es distinto de mi \"Remanente\" en Presupuesto?** El Remanente es tu salario menos tus gastos fijos. El libre de Proyectos también cuenta tus ingresos y gastos extra de ese mes y lo que ya apartas para otros proyectos.",
        "**Un ingreso extra mío no cuenta en mi libre. ¿Por qué?** Probablemente está como **Conjunto** (sin dueño). Lo conjunto no se le suma ni se le resta a nadie. En Presupuesto, usa el lápiz de ese ítem y elige **¿De quién es?**.",
        "**¿Por qué no puedo marcar la línea de ahorro de otra persona?** Solo quien aporta puede marcarla como apartada.",
        "**¿Los montos son lo que de verdad gasté?** No: son lo que planeaste. Por eso los meses que vienen ya tienen números.",
        "**¿Puedo deshacer archivar un proyecto?** Sí: los proyectos archivados aparecen al final de Proyectos con un botón **Restaurar**.",
        "**¿Cómo cambio el idioma?** En Perfil y seguridad, o con el selector de idioma de las páginas públicas.",
      ],
    },
  },
];
