import "server-only";

import nodemailer from "nodemailer";

import { getServerEnv } from "@/lib/env";

/**
 * The single entry point of the e-mails PDS OS sends itself (non-negotiable
 * rule 2): from PO's Google account (EMAIL_SMTP_USER, through Gmail's SMTP
 * with an app password), in the name of the member who sends, replies going
 * back to them. Plain text, and the same in HTML in the common frame when
 * the caller gives it (lib/email/compose.ts).
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
  // The same message in HTML (lib/email/compose.ts); clients pick one.
  html?: string;
  // The member who sends: shown as the sender's name, and the reply-to.
  sender: { name: string; email: string | null };
  // Other reply-to addresses, after the member's: PO's own for a request
  // whose replies PDS OS files (lib/email/reply-address.ts).
  replyTo?: string[];
  // Files joined to the e-mail (a meeting's report as a PDF).
  attachments?: EmailAttachment[];
  // More recipients, in copy and in hidden copy (Sacha 22/11/2026).
  alsoTo?: string[];
  cc?: string[];
  bcc?: string[];
  // An answer: the Message-ID it answers and its whole thread, so mail apps
  // keep it in the same conversation (the page « Mails »).
  inReplyTo?: string;
  references?: string[];
};

export type EmailAttachment = {
  filename: string;
  content: Uint8Array;
  contentType: string;
};

function replyToOf(mail: OutgoingEmail): string[] | undefined {
  const all = [mail.sender.email, ...(mail.replyTo ?? [])].filter(
    (address): address is string => Boolean(address),
  );
  return all.length > 0 ? all : undefined;
}

export async function sendEmail(
  mail: OutgoingEmail,
): Promise<
  { ok: true; messageId: string } | { ok: false; reason: "disabled" | "failed" }
> {
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
    const info = await transport.sendMail({
      from: { name: `${mail.sender.name} · PDS`, address: env.EMAIL_SMTP_USER },
      to: [
        { name: mail.to.name, address: mail.to.email },
        ...(mail.alsoTo ?? []),
      ],
      cc: mail.cc?.length ? mail.cc : undefined,
      bcc: mail.bcc?.length ? mail.bcc : undefined,
      replyTo: replyToOf(mail),
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      inReplyTo: mail.inReplyTo,
      references: mail.references?.length ? mail.references : undefined,
      attachments: mail.attachments?.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content),
        contentType: a.contentType,
      })),
    });
    return { ok: true, messageId: info.messageId };
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
