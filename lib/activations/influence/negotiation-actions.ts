"use server";

import { z } from "zod";

import {
  activationDone,
  activationFailure,
  invalid,
  textOrNull,
} from "@/lib/activations/result";
import { requireApproved } from "@/lib/auth/dal";
import { emailLink } from "@/lib/email/link-email";
import { projectTitleOf } from "@/lib/email/outcome";
import { emailEnabled } from "@/lib/email/send";
import { core } from "@/lib/i18n/fr/core";
import { formatDay } from "@/lib/utils/day";
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
  | {
      ok: true;
      url: string;
      // What PDS OS did itself: « sent » (e-mailed to the creator and
      // declared sent by e-mail), « failed » (copy the link), « disabled »
      // (no SMTP or no address: the manual way, as before).
      emailed: "sent" | "failed" | "disabled";
    }
  | { ok: false; error: string };

/** « Préparer le lien d'accord » : the token is returned once, its hash kept.
 * PDS OS e-mails it to the creator when it can and declares it sent by
 * e-mail (Sacha, 05/11/2026) ; else the link is shown to be copied. */
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
  const url = `${siteUrl()}${routes.influenceAgreement(data)}`;
  const emailed = await emailAgreement(
    parsed.data.projectId,
    parsed.data.id,
    url,
  );
  return { ok: true, url, emailed };
}

/** E-mails the creator the agreement page just prepared, then declares it
 * sent by e-mail. Never fails the gesture. */
async function emailAgreement(
  projectId: string,
  proposalId: string,
  url: string,
): Promise<"sent" | "failed" | "disabled"> {
  if (!emailEnabled()) return "disabled";
  const supabase = await createClient();
  const { data: proposal } = await supabase
    .from("influence_proposals")
    .select("target_id, activation_id")
    .eq("id", proposalId)
    .maybeSingle();
  if (!proposal) return "disabled";
  const [{ data: target }, { data: activation }, { data: agreement }] =
    await Promise.all([
      supabase
        .from("activation_targets")
        .select("contact_id")
        .eq("id", proposal.target_id)
        .maybeSingle(),
      supabase
        .from("marketing_activations")
        .select("title")
        .eq("id", proposal.activation_id)
        .maybeSingle(),
      supabase
        .from("influence_agreements")
        .select("id, expires_at")
        .eq("target_id", proposal.target_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
  if (!target || !agreement) return "disabled";
  const { data: contact } = await supabase
    .from("network_contacts")
    .select("name, email")
    .eq("id", target.contact_id)
    .maybeSingle();
  if (!contact?.email) return "disabled";
  const t = fr.activationInfluence.agreement.email;
  const sent = await emailLink({
    to: { name: contact.name, email: contact.email },
    subject: t.subject(
      await projectTitleOf(projectId),
      activation?.title ?? "",
    ),
    message: `${core.linkEmail.greeting(contact.name)}\n\n${t.body}`,
    open: t.open,
    url,
    validity: agreement.expires_at
      ? core.linkEmail.validity(formatDay(agreement.expires_at))
      : null,
  });
  if (sent === "sent") {
    const { error } = await supabase.rpc("declare_influence_agreement_sent", {
      p_agreement_id: agreement.id,
      p_channel: "email",
    });
    if (error) console.error("emailAgreement declare:", error.message);
  }
  return sent;
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
