// The addresses a person types in an e-mail's « À », « Cc » or « Cci »
// (Sacha 22/11/2026): several, separated by commas, semicolons or spaces.
// Client-safe, pure.

import { mail } from "@/lib/i18n/fr/mail";

const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

/** Every address of the field, trimmed, each once. */
export function addressesOf(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/[\s,;]+/)
        .map((a) => a.trim())
        .filter(Boolean),
    ),
  ];
}

/** The ones that are not an e-mail address (« jean@ », « label.fr »). */
export const invalidAddresses = (text: string) =>
  addressesOf(text).filter((a) => !EMAIL.test(a));

/** Who an e-mail goes to, as the person wrote it in the card. */
export type MailEnvelope = {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
};

/** What is wrong in an envelope, said on its row after a first try. */
export function envelopeErrors(e: MailEnvelope) {
  const wrong = (text: string) => {
    const bad = invalidAddresses(text);
    return bad.length ? mail.addressesInvalid(bad.join(", ")) : undefined;
  };
  return {
    to: addressesOf(e.to).length === 0 ? mail.toMissing : wrong(e.to),
    cc: wrong(e.cc),
    bcc: wrong(e.bcc),
    subject: e.subject.trim() ? undefined : mail.subjectMissing,
  };
}
