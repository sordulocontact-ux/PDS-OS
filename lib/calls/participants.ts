// Who takes part in a prepared exchange (Cadrage, Stratégie): a member of
// the team, proposed by PO by name, or a person of the Réseau, linked by
// their contact (UX test of 09/10/2026, section 8: « participants d'un call
// en nom libre, hors Réseau »). Stored as { name, contact_id? } in
// framing_calls / strategy_calls.participants (framing_calls_check reads
// the name only). Client-safe.

import { z } from "zod";

export type Participant = { name: string; contactId: string | null };

/** The participants sent by the form: a name (as before) or a contact. */
export const participantSchema = z.union([
  z
    .string()
    .trim()
    .min(1)
    .max(120)
    .transform((name): Participant => ({ name, contactId: null })),
  z.object({
    name: z.string().trim().min(1).max(120),
    contactId: z.uuid().nullable(),
  }),
]);

/** As the SQL functions take them. */
export const participantRow = (p: Participant) =>
  p.contactId ? { name: p.name, contact_id: p.contactId } : { name: p.name };
