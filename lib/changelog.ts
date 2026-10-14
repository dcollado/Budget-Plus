// Log of interface changes, in broad strokes, so an admin can review them
// at /cambios (public page: nothing sensitive here; no names, amounts,
// emails or IDs). Add a new entry at the TOP when making visible UI changes.

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
    titulo: "Changes page and safer sign-in",
    cambios: [
      {
        tipo: "nuevo",
        texto:
          "This page (/cambios): a public summary of interface changes, no sign-in required.",
      },
      {
        tipo: "mejora",
        texto:
          "Sign-in accepts email or username, and limits failed attempts.",
      },
      {
        tipo: "ajuste",
        texto:
          "The whole interface is now in English.",
      },
    ],
  },
  {
    fecha: "2026-10-13",
    titulo: "User menu, profile and annual report",
    cambios: [
      {
        tipo: "nuevo",
        texto:
          "Annual report (\"Year summary\") with a savings flag per category.",
      },
      {
        tipo: "nuevo",
        texto:
          "Profile page: change your name and password from the app.",
      },
      {
        tipo: "mejora",
        texto:
          "Dropdown user menu (profile, members/admin, sign out).",
      },
      {
        tipo: "ajuste",
        texto:
          "\"Accounts and fixed expenses\" moved to the user menu; the top bar keeps Budget and Report.",
      },
    ],
  },
  {
    fecha: "2026-10-12",
    titulo: "Multiple households and admin panel",
    cambios: [
      {
        tipo: "nuevo",
        texto:
          "Admin panel to create and manage households and members on a single screen.",
      },
      {
        tipo: "nuevo",
        texto:
          "Email invitations and password recovery (\"Forgot password\").",
      },
      {
        tipo: "nuevo",
        texto:
          "Archive, restore and delete households, confirmed by typing the name.",
      },
      {
        tipo: "nuevo",
        texto: "Log of administration actions visible to the super-admin.",
      },
      {
        tipo: "mejora",
        texto:
          "Per-member colors taken from a household palette.",
      },
      {
        tipo: "mejora",
        texto:
          "Clear message when there is no household and a getting-started card for empty households.",
      },
    ],
  },
  {
    fecha: "2026-10-05",
    titulo: "Variable expenses",
    cambios: [
      {
        tipo: "mejora",
        texto:
          "Variable expenses can have an optional account and are shown in the month's list.",
      },
    ],
  },
  {
    fecha: "2026-09-30",
    titulo: "Budget, transfers and fixed expenses",
    cambios: [
      {
        tipo: "nuevo",
        texto:
          "\"Your transfers\": a table of how much to send to each account, above the budget, full width and collapsible.",
      },
      {
        tipo: "nuevo",
        texto:
          "Budget with two months side by side, payment dates and a compact layout.",
      },
      {
        tipo: "nuevo",
        texto: "Payment reminders synced with a shared calendar.",
      },
      {
        tipo: "mejora",
        texto:
          "Settings split into tabs (Fixed and My accounts), with income first and groups by person color.",
      },
    ],
  },
];
