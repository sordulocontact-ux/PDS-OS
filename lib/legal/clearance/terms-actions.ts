"use server";

import { z } from "zod";

import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import { run } from "@/lib/legal/clearance/run";
import { RIGHT_KINDS } from "@/lib/legal/clearance/matrix";

// Conditions received and the contract of each right (ticket Juridique 05).

const ids = { projectId: catalogIdSchema, clearanceId: catalogIdSchema };

const termsSchema = z.object({
  ...ids,
  communicationId: catalogIdSchema.nullable(),
  terms: z.object({
    right: z.enum(RIGHT_KINDS).nullable(),
    amountCents: z.number().int().min(0).max(100_000_000).nullable(),
    share: z.string().trim().max(200),
    credits: z.string().trim().max(500),
    territory: z.string().trim().max(200),
    duration: z.string().trim().max(200),
    other: z.string().trim().max(2000),
  }),
});
export async function proposeTerms(input: z.input<typeof termsSchema>) {
  const p = termsSchema.safeParse(input);
  if (!p.success)
    return { ok: false as const, error: fr.legalClearance.errors.failed };
  const t = p.data.terms;
  return run(p.data.projectId, (s) =>
    s.rpc("propose_clearance_terms", {
      p_clearance_id: p.data.clearanceId,
      p_communication_id: p.data.communicationId,
      p_terms: {
        right: t.right,
        amount_cents: t.amountCents,
        share: t.share,
        credits: t.credits,
        territory: t.territory,
        duration: t.duration,
        other: t.other,
      },
    }),
  );
}

export async function decideTerms(
  projectId: string,
  termsId: string,
  accept: boolean,
) {
  const p = z
    .object({ projectId: catalogIdSchema, termsId: catalogIdSchema })
    .safeParse({ projectId, termsId });
  if (!p.success)
    return { ok: false as const, error: fr.auth.errors.forbidden };
  return run(p.data.projectId, (s) =>
    s.rpc("decide_clearance_terms", {
      p_terms_id: p.data.termsId,
      p_accept: accept === true,
    }),
  );
}

export async function linkContract(
  projectId: string,
  clearanceId: string,
  right: string,
  contractId: string,
) {
  const p = z
    .object({ ...ids, right: z.enum(RIGHT_KINDS), contractId: catalogIdSchema })
    .safeParse({ projectId, clearanceId, right, contractId });
  if (!p.success)
    return { ok: false as const, error: fr.auth.errors.forbidden };
  return run(p.data.projectId, (s) =>
    s.rpc("link_clearance_contract", {
      p_clearance_id: p.data.clearanceId,
      p_right: p.data.right,
      p_contract_id: p.data.contractId,
    }),
  );
}
