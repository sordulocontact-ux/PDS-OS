import "server-only";

import nodemailer from "nodemailer";

import { getServerEnv } from "@/lib/env";

/**
 * The single entry point of the e-mails PDS OS sends itself (non-negotiable
 * rule 2): from PO's Google account (EMAIL_SMTP_USER, through Gmail's SMTP
 * with an app password), in the name of the member who sends, replies going
 * back to them. Plain text only: what the member wrote, then the link.
 * Without the two variables, `emailEnabled()` is false and every sending
 * stays declared (« Marquer comme envoyé »).
 */
export function emailEnabled(): boolean {
  const env = getServerEnv();
  return Boolean(env.EMAIL_SMTP_USER && env.EMAIL_SMTP_PASSWORD);
}

export type OutgoingEmail = {
  to: { name: string; email: string };
  subject: string;
  text: string;
  // The member who sends: shown as the sender's name, and the reply-to.
  sender: { name: string; email: string | null };
};

export async function sendEmail(
  mail: OutgoingEmail,
): Promise<{ ok: true } | { ok: false; reason: "disabled" | "failed" }> {
  const env = getServerEnv();
  if (!env.EMAIL_SMTP_USER || !env.EMAIL_SMTP_PASSWORD)
    return { ok: false, reason: "disabled" };
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: env.EMAIL_SMTP_USER, pass: env.EMAIL_SMTP_PASSWORD },
  });
  try {
    await transport.sendMail({
      from: { name: `${mail.sender.name} · PDS`, address: env.EMAIL_SMTP_USER },
      to: { name: mail.to.name, address: mail.to.email },
      replyTo: mail.sender.email ?? undefined,
      subject: mail.subject,
      text: mail.text,
    });
    return { ok: true };
  } catch (error) {
    // Never the message nor the addresses in the logs.
    console.error(
      "sendEmail:",
      error instanceof Error ? error.message.slice(0, 200) : "unknown",
    );
    return { ok: false, reason: "failed" };
  } finally {
    transport.close();
  }
}
