"use server";

import { z } from "zod";

import {
  activationDone,
  activationFailure,
  invalid,
  textOrNull,
} from "@/lib/activations/result";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { siteUrl } from "@/lib/auth/site-url";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const text = (max: number) => z.string().max(max);

const proposalSchema = z.object({
  projectId: z.uuid(),
  activationId: z.uuid(),
  targetId: z.uuid(),
  party: z.enum(["pds", "creator"]),
  fee: z.number().nonnegative().max(1e9).nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  deliverables: text(2000),
  schedule: text(1000),
  organicUsage: text(1000),
  adsUsage: text(1000),
  exclusivity: text(1000),
  expenses: text(1000),
  conditions: text(3000),
  note: text(2000),
});

/** A position of PDS or of the creator, kept as given (immutable). */
export async function recordProposal(
  input: z.input<typeof proposalSchema>,
): Promise<WriteResult> {
  const access = await requireApproved();
  const parsed = proposalSchema.safeParse(input);
  if (!parsed.success)
    return invalid(fr.activationInfluence.errors.amountInvalid);
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("influence_proposals").insert({
    target_id: v.targetId,
    party: v.party,
    fee_amount: v.fee,
    currency: v.currency,
    deliverables: textOrNull(v.deliverables),
    schedule: textOrNull(v.schedule),
    organic_usage: textOrNull(v.organicUsage),
    ads_usage: textOrNull(v.adsUsage),
    exclusivity: textOrNull(v.exclusivity),
    expenses: textOrNull(v.expenses),
    conditions: textOrNull(v.conditions),
    note: textOrNull(v.note),
    // Overwritten from the collaboration by the database.
    organization_id: access.organizationId ?? "",
    project_id: v.projectId,
    activation_id: v.activationId,
  });
  return error ? activationFailure(error) : activationDone(v.projectId);
}

const idSchema = z.object({ projectId: z.uuid(), id: z.uuid() });

/** « Valider ces conditions » : the latest position only. */
export async function acceptTerms(
  input: z.input<typeof idSchema>,
): Promise<WriteResult> {
  await requireApproved();
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_influence_terms", {
    p_proposal_id: parsed.data.id,
  });
  return error
    ? activationFailure(error)
    : activationDone(parsed.data.projectId);
}

export type AgreementLinkResult =
  { ok: true; url: string } | { ok: false; error: string };

/** « Préparer le lien d'accord » : the token is returned once, its hash kept ;
 * the link is shown to be copied, never sent by PDS OS. */
export async function prepareAgreement(
  input: z.input<typeof idSchema>,
): Promise<AgreementLinkResult> {
  await requireApproved();
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("prepare_influence_agreement", {
    p_proposal_id: parsed.data.id,
  });
  if (error || !data) return activationFailure(error ?? {});
  activationDone(parsed.data.projectId);
  return { ok: true, url: `${siteUrl()}${routes.influenceAgreement(data)}` };
}

export async function revokeAgreement(
  input: z.input<typeof idSchema>,
): Promise<WriteResult> {
  await requireApproved();
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_influence_agreement", {
    p_agreement_id: parsed.data.id,
  });
  return error
    ? activationFailure(error)
    : activationDone(parsed.data.projectId);
}

/** « Marquer comme envoyé » : the pending agreement's link has left, by this
 * channel (recette of 23/10, MKT-INF-002; PDS OS sends no e-mail itself). */
export async function declareAgreementSent(input: {
  projectId: string;
  id: string;
  channel: "email" | "dm" | "whatsapp" | "other";
}): Promise<WriteResult> {
  await requireApproved();
  const parsed = idSchema
    .extend({ channel: z.enum(["email", "dm", "whatsapp", "other"]) })
    .safeParse(input);
  if (!parsed.success) return invalid();
  const supabase = await createClient();
  const { error } = await supabase.rpc("declare_influence_agreement_sent", {
    p_agreement_id: parsed.data.id,
    p_channel: parsed.data.channel,
  });
  return error
    ? activationFailure(error)
    : activationDone(parsed.data.projectId);
}
