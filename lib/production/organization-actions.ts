"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import {
  prepDone,
  prepFailure,
  type PrepResult,
} from "@/lib/production/prep-result";
import { createClient } from "@/lib/supabase/server";

const e = fr.productionOrganization.errors;
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

const schema = z.object({
  projectId: z.uuid(),
  deliverableId: z.uuid(),
  organization: z.enum(["internal", "external"]),
  companyContactId: z.uuid().nullable(),
  lineProducerPersonId: z.uuid().nullable(),
  quoteValidatorPersonId: z.uuid(),
  director: holder,
  dop: holder,
});

/**
 * « Lancer la production » (the owner, Ibé 14/10): opens the sheet when it is
 * not yet, then records who produces and who holds each role — the database
 * checks the members and contacts and tells those given a role.
 */
export async function organizeProduction(
  input: z.input<typeof schema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return {
      ok: false,
      error:
        field === "quoteValidatorPersonId"
          ? e.validator
          : field === "organization"
            ? e.kind
            : fr.productionPrep.errors.invalid,
    };
  }
  const p = parsed.data;
  if (p.organization === "external" && !p.companyContactId)
    return { ok: false, error: e.company };
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("production_sheets")
    .select("id")
    .eq("deliverable_id", p.deliverableId)
    .maybeSingle();
  let sheetId = existing?.id ?? null;
  if (!sheetId) {
    const { data, error } = await supabase.rpc("open_production_sheet", {
      p_deliverable_id: p.deliverableId,
      p_mode: "direct",
    });
    if (error || !data) return prepFailure(error ?? {});
    sheetId = data;
  }
  const { error } = await supabase.rpc("set_production_organization", {
    p_sheet_id: sheetId,
    p_organization: p.organization,
    p_company_contact_id: p.companyContactId,
    p_line_producer_person_id: p.lineProducerPersonId,
    p_quote_validator_person_id: p.quoteValidatorPersonId,
    p_dop_person_id: p.dop.person,
    p_dop_contact_id: p.dop.contact,
  });
  if (error) {
    if (error.message?.includes("company_required"))
      return { ok: false, error: e.company_required };
    if (error.message?.includes("quote_validator_required"))
      return { ok: false, error: e.quote_validator_required };
    return prepFailure(error);
  }
  const { error: directorError } = await supabase.rpc(
    "set_production_director",
    {
      p_sheet_id: sheetId,
      p_person_id: p.director.person,
      p_contact_id: p.director.contact,
    },
  );
  return directorError ? prepFailure(directorError) : prepDone(p.projectId);
}
