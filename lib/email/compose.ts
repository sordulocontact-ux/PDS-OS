import "server-only";

import {
  button,
  emailDocument,
  escapeHtml,
  fallbackLink,
  note,
  paragraph,
  rule,
  textToHtml,
} from "@/lib/email/layout";
import { emails } from "@/lib/i18n/fr/emails";

/**
 * The two shapes of the e-mails a member sends through PDS OS, each as plain
 * text (unchanged, for clients that read only that) and as HTML in the
 * common frame (lib/email/layout.ts). A letter more than a notification:
 * no title, their message first, one button when there is a link.
 */
export type ComposedEmail = { text: string; html: string };

export type LinkEmailParts = {
  // What the member wrote (« Bonjour Karim, … »).
  message: string;
  // « Ouvrir votre dossier : »: the text line, and the button without « : ».
  open: string;
  url: string;
  validity?: string | null;
  // « Sacha Moricet, PDS ».
  signature: string;
  // The member's name, for « Envoyé avec PDS OS au nom de … ».
  sender: string;
  subject: string;
};

export function composeLinkEmail(parts: LinkEmailParts): ComposedEmail {
  const text = [
    parts.message.trim(),
    "",
    `${parts.open} ${parts.url}`,
    ...(parts.validity ? [parts.validity] : []),
    "",
    parts.signature,
    "",
  ].join("\n");
  const url = escapeHtml(parts.url);
  const html = frame(parts.subject, parts.message, parts.sender, [
    textToHtml(parts.message),
    button(escapeHtml(buttonLabel(parts.open)), url),
    ...(parts.validity ? [note(escapeHtml(parts.validity))] : []),
    paragraph(escapeHtml(parts.signature)),
    rule(),
    fallbackLink(escapeHtml(emails.buttonFallback), url),
  ]);
  return { text, html };
}

export type MessageEmailParts = {
  text: string;
  signature: string;
  sender: string;
  subject: string;
};

export function composeMessageEmail(parts: MessageEmailParts): ComposedEmail {
  const text = [parts.text.trim(), "", parts.signature, ""].join("\n");
  const html = frame(parts.subject, parts.text, parts.sender, [
    textToHtml(parts.text),
    paragraph(escapeHtml(parts.signature)),
  ]);
  return { text, html };
}

// « Ouvrir votre dossier : » → « Ouvrir votre dossier ».
function buttonLabel(open: string): string {
  return open.replace(/\s*:\s*$/, "");
}

function frame(
  subject: string,
  message: string,
  sender: string,
  blocks: string[],
): string {
  return emailDocument({
    title: subject,
    brand: emails.brand,
    // The inbox preview: their words after the greeting.
    preheader: previewOf(message),
    blocks,
    footer: emails.sentFor(sender),
  });
}

function previewOf(message: string): string {
  const [first, ...rest] = message.trim().split(/\n\s*\n/);
  const body = (rest.length > 0 ? rest.join(" ") : (first ?? "")).replace(
    /\s+/g,
    " ",
  );
  return body.length > 140 ? `${body.slice(0, 139)}…` : body;
}
