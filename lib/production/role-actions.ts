"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { withOutcome } from "@/lib/journey/outcome";
import { schedulePendingPushes } from "@/lib/notifications/push";
import {
  prepDone,
  prepFailure,
  type PrepResult,
} from "@/lib/production/prep-result";
import { createClient } from "@/lib/supabase/server";

const t = fr.productionProducer;

const holder = z
  .string()
  .regex(/^((person|contact):[0-9a-f-]{36})?$/)
  .transform((v) => {
    if (!v) return { person: null, contact: null };
    const [kind, id] = v.split(":");
    return kind === "person"
      ? { person: id, contact: null }
      : { person: null, contact: id };
  });

const roleSchema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  role: z.enum(["producer", "validator", "director", "dop"]),
  holder,
});

/**
 * « Changer » a role of « Qui fait quoi » (the project's owner, proto
 * rolesModal): only that role changes, the steps already started stay as
 * they are; the change is journaled (production_events, « organized »).
 */
export async function changeProductionRole(
  input: z.input<typeof roleSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = roleSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: fr.productionPrep.errors.invalid };
  const p = parsed.data;
  if (p.role === "validator" && !p.holder.person)
    return { ok: false, error: t.role.required };
  const supabase = await createClient();
  if (p.role === "director") {
    const { error } = await supabase.rpc("set_production_director", {
      p_sheet_id: p.sheetId,
      p_person_id: p.holder.person,
      p_contact_id: p.holder.contact,
    });
    return error ? prepFailure(error) : prepDone(p.projectId);
  }
  const { data: s, error: readError } = await supabase
    .from("production_sheets")
    .select(
      "organization, company_contact_id, line_producer_person_id, quote_validator_person_id, dop_person_id, dop_contact_id",
    )
    .eq("id", p.sheetId)
    .maybeSingle();
  if (readError || !s?.organization) return prepFailure(readError ?? {});
  const { error } = await supabase.rpc("set_production_organization", {
    p_sheet_id: p.sheetId,
    p_organization: s.organization,
    p_company_contact_id: s.company_contact_id,
    p_line_producer_person_id:
      p.role === "producer" ? p.holder.person : s.line_producer_person_id,
    p_quote_validator_person_id:
      p.role === "validator"
        ? (p.holder.person ?? "")
        : (s.quote_validator_person_id ?? ""),
    p_dop_person_id: p.role === "dop" ? p.holder.person : s.dop_person_id,
    p_dop_contact_id: p.role === "dop" ? p.holder.contact : s.dop_contact_id,
  });
  if (error) return prepFailure(error);
  await schedulePendingPushes();
  return prepDone(p.projectId);
}

const revokeSchema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  contactId: z.uuid(),
});

/** « Révoquer » a private link: it stops working, the deposits stay. */
export async function revokeProviderLink(
  input: z.input<typeof revokeSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = revokeSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: fr.productionPrep.errors.invalid };
  const p = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_production_provider_link", {
    p_sheet_id: p.sheetId,
    p_contact_id: p.contactId,
  });
  return error ? prepFailure(error) : prepDone(p.projectId);
}

const changeSchema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  deliverableTitle: z.string().max(200),
  choice: z.string().regex(/^(internal|external:[0-9a-f-]{36})$/),
  reason: z.string().trim().min(1).max(1000),
  revoke: z.boolean(),
  done: z.array(z.string().max(300)).max(30),
  carried: z.array(z.string().max(300)).max(30),
});

/**
 * « Changer qui produit » (the project's owner, proto pqChangeModal): a new
 * choice with its reason; the previous one stays in « Choix précédents »
 * with what was already done, and nothing of it is deleted.
 */
export async function changeProducer(
  input: z.input<typeof changeSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = changeSchema.safeParse(input);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return {
      ok: false,
      error:
        field === "reason"
          ? t.change.errors.reason
          : field === "choice"
            ? t.change.errors.choice
            : fr.productionPrep.errors.invalid,
    };
  }
  const p = parsed.data;
  const [kind, company] = p.choice.split(":") as [
    "internal" | "external",
    string | undefined,
  ];
  return withOutcome(
    p.projectId,
    ["marketing"],
    t.done(p.deliverableTitle, t.kinds[kind].label),
    async () => {
      const supabase = await createClient();
      const { error } = await supabase.rpc("change_production_producer", {
        p_sheet_id: p.sheetId,
        p_organization: kind,
        p_company_contact_id: company ?? null,
        p_reason: p.reason,
        p_revoke_link: p.revoke,
        p_done: p.done,
        p_carried: p.carried,
      });
      if (error) {
        if (error.message?.includes("same_producer"))
          return { ok: false, error: t.change.errors.same };
        if (error.message?.includes("reason_required"))
          return { ok: false, error: t.change.errors.reason };
        return prepFailure(error);
      }
      await schedulePendingPushes();
      return prepDone(p.projectId);
    },
  );
}
