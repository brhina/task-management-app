import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });
  return transporter;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  const tx = getTransporter();
  if (!tx) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[email:dev] To: ${params.to} | ${params.subject}`);
      console.log(params.text || params.html.slice(0, 200));
    }
    return false;
  }

  try {
    await tx.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    return true;
  } catch (err) {
    console.error("Failed to send email:", err);
    return false;
  }
}

export function emailTemplate(params: {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): string {
  const cta =
    params.ctaLabel && params.ctaUrl
      ? `<p style="margin-top:24px"><a href="${params.ctaUrl}" style="background:#0891b2;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">${params.ctaLabel}</a></p>`
      : "";
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#1e293b;border-radius:12px;padding:24px">
    <h1 style="font-size:18px;margin:0 0 12px">${params.title}</h1>
    <div style="font-size:14px;line-height:1.5;color:#cbd5e1">${params.body}</div>
    ${cta}
    <p style="margin-top:24px;font-size:12px;color:#64748b">Cadence · Task Management</p>
  </div></body></html>`;
}
