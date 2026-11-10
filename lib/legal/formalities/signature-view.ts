// How a signature of the SACEM bulletin reads, on a signer's link card and
// on a line of its own (PDS Éditions, a signer without a Réseau contact).
// Pure, server and client.

import { legalFormalities } from "@/lib/i18n/fr/legal-formalities";
import { signedReturns } from "@/lib/i18n/fr/signed-returns";
import type { FormalityView } from "@/lib/legal/formalities/types";
import type { Tone } from "@/lib/ui/state-tones";
import { formatShortDay } from "@/lib/utils/day";

const fr = { legalFormalities, signedReturns };

export type Signature = FormalityView["signatures"][number];

/** « Auteur, Compositeur », « Éditeur ». */
export function signatureRole(s: Signature): string {
  const t = fr.legalFormalities;
  if (s.role === "publisher") return t.page.publisherRole;
  return t.qualities[s.role as keyof typeof t.qualities] ?? s.role;
}

/** Where it stands: « En attente », « Signé », « Ne vaut plus ». */
export function signatureBadge(s: Signature): { tone: Tone; label: string } {
  const r = fr.signedReturns;
  if (s.superseded) return { tone: "neutral", label: r.sacem.superseded };
  if (s.status === "signed")
    return { tone: "success", label: r.portal.signedBadge };
  return { tone: "warning", label: r.sacem.pending };
}

/** How it was signed, once signed: by the link, otherwise, by the house. */
export function signatureHow(s: Signature): string | null {
  const t = fr.legalFormalities.page;
  const r = fr.signedReturns.sacem;
  if (s.status !== "signed") return null;
  const day = (value: string | null) =>
    value ? formatShortDay(value, { bare: true }) : "";
  if (s.via === "link") return r.byLink(day(s.signedOn ?? s.at));
  if (s.via === "other") return r.otherwise(day(s.signedOn));
  if (s.via === "house") return r.byHouse(day(s.signedOn ?? s.at));
  return s.proof ?? t.signed(day(s.at));
}
