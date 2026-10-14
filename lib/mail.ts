import nodemailer from "nodemailer";
import { getT } from "@/lib/i18n/server";

type Correo = { to: string; subject: string; text: string; html: string };

export function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Con SMTP_HOST y SMTP_PASS definidos envía de verdad. Sin ellos, en
// desarrollo solo imprime el correo (con sus enlaces) en la consola del
// servidor; en producción falla para no perder avisos en silencio.
export async function enviarCorreo(correo: Correo): Promise<void> {
  const host = process.env.SMTP_HOST;
  const pass = process.env.SMTP_PASS;

  if (!host || !pass) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP configuration is missing (SMTP_HOST / SMTP_PASS).");
    }
    console.log(
      `\n[simulated email] To: ${correo.to}\nSubject: ${correo.subject}\n${correo.text}\n`
    );
    return;
  }

  const port = Number(process.env.SMTP_PORT ?? 465);
  const transporte = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass },
  });

  await transporte.sendMail({
    from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
    to: correo.to,
    subject: correo.subject,
    text: correo.text,
    html: correo.html,
  });
}

export function urlApp(ruta: string): string {
  const crudo = (process.env.APP_URL ?? "http://localhost:3000").trim().replace(/\/+$/, "");
  // Si se configuró sin esquema ("budget.ejemplo.com"), se asume https.
  const base = /^https?:\/\//i.test(crudo) ? crudo : `https://${crudo}`;
  return `${base}${ruta}`;
}

function plantilla(
  titulo: string,
  parrafo: string,
  boton: string,
  enlace: string,
  fallback: string
): string {
  return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#1f2933">
<h2 style="margin:0 0 12px">${escaparHtml(titulo)}</h2>
<p style="line-height:1.5">${escaparHtml(parrafo)}</p>
<p style="margin:24px 0"><a href="${escaparHtml(enlace)}" style="background:#d4a24c;color:#111;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">${escaparHtml(boton)}</a></p>
<p style="font-size:12px;color:#6b7280">${escaparHtml(fallback)}<br>${escaparHtml(enlace)}</p>
</div>`;
}

// Emails go out in the language of whoever triggers them (their cookie).
export async function correoInvitacion(opts: {
  to: string;
  hogar: string;
  enlace: string;
}): Promise<void> {
  const { t } = await getT();
  const parrafo = t("mail.inviteBody", { household: opts.hogar });
  await enviarCorreo({
    to: opts.to,
    subject: t("mail.inviteSubject", { household: opts.hogar }),
    text: `${parrafo}

${t("mail.inviteAccept")}: ${opts.enlace}`,
    html: plantilla(
      t("mail.inviteTitle"),
      parrafo,
      t("mail.inviteButton"),
      opts.enlace,
      t("mail.buttonFallback")
    ),
  });
}

export async function correoReset(opts: { to: string; enlace: string }): Promise<void> {
  const { t } = await getT();
  const parrafo = t("mail.resetBody");
  await enviarCorreo({
    to: opts.to,
    subject: t("mail.resetSubject"),
    text: `${parrafo}

${t("mail.resetAction")}: ${opts.enlace}`,
    html: plantilla(
      t("mail.resetTitle"),
      parrafo,
      t("mail.resetButton"),
      opts.enlace,
      t("mail.buttonFallback")
    ),
  });
}
