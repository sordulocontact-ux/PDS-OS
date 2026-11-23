import "server-only";

import { contractOfAddress } from "@/lib/email/contract-address";
import { dealOfAddress } from "@/lib/email/deal-memo-address";
import { clearanceOfAddress } from "@/lib/email/reply-address";
import { isProofsAddress } from "@/lib/finance/proof-address";
import type { MailKind } from "@/lib/mailbox/types";

// Words of a subject or a file's name, lowercased, without accents.
const words = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

// Read in the subject and the files' names (« Contrat signé.pdf », « Devis
// n°12 », « Facture 2026-031 »); the words a signing service writes too.
const BY_WORDS: Array<[MailKind, RegExp]> = [
  [
    "signature",
    /\bsign(e|ee|es|ees|ed|ature|atures|er|ez)\b|yousign|docusign|\besign/,
  ],
  ["quote", /\bdevis\b|\bquote\b|\bquotation\b|\bestimate\b/],
  ["invoice", /\bfactur(e|es|ation)\b|\binvoices?\b/],
  ["contract", /\bcontrats?\b|\bcontracts?\b|\bavenants?\b/],
];

/**
 * What an e-mail is (Sacha 23/11/2026: « les signatures, les devis »),
 * computed by code at each reading, never stored, never by the AI (rule 6):
 * its words, and PO's addresses it was sent to (po+justificatifs@, po+deal-
 * <id>@, po+aut-<id>@). Several at once: a quote signed is both.
 */
export function mailKinds(mail: {
  subject: string;
  attachments: { name: string }[];
  to: string[];
  cc: string[];
}): MailKind[] {
  const text = words(
    [mail.subject, ...mail.attachments.map((a) => a.name)].join(" "),
  ).replace(/[_.\-]+/g, " ");
  const kinds = new Set<MailKind>(
    BY_WORDS.filter(([, pattern]) => pattern.test(text)).map(([k]) => k),
  );
  const addresses = [...mail.to, ...mail.cc];
  if (addresses.some(isProofsAddress)) kinds.add("proof");
  if (addresses.some((a) => dealOfAddress(a))) kinds.add("deal_memo");
  if (addresses.some((a) => clearanceOfAddress(a))) kinds.add("clearance");
  // A reply to a contract's signature e-mail (po+ctr-<id>@).
  if (addresses.some((a) => contractOfAddress(a))) {
    kinds.add("signature");
    kinds.add("contract");
  }
  return [...kinds];
}
