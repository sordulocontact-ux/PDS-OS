import { z } from "zod";

/** Who an e-mail goes to as sent to the server: the addresses of « À »
 * (one at least), « Cc », « Cci » (Sacha 22/11/2026), already split by
 * the form (addressesOf). */
export const envelopeInput = z.object({
  to: z.array(z.email()).min(1).max(20),
  cc: z.array(z.email()).max(20).default([]),
  bcc: z.array(z.email()).max(20).default([]),
});
export type EnvelopeInput = z.input<typeof envelopeInput>;

/** « a@x.fr, b@y.fr · copie à c@z.fr · copie cachée à d@w.fr »: who it
 * went to, kept as the proof of sending. */
export function envelopeProof(e: z.output<typeof envelopeInput>): string {
  return [
    e.to.join(", "),
    e.cc.length ? `copie à ${e.cc.join(", ")}` : null,
    e.bcc.length ? `copie cachée à ${e.bcc.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
