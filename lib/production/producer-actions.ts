"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { loadValidators } from "@/lib/framing/related";
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

const schema = z.object({
  projectId: z.uuid(),
  deliverableId: z.uuid(),
  organization: z.enum(["internal", "external"]),
  companyContactId: z.uuid().nullable(),
  mode: z.enum(["direct", "call", "import"]),
});

/**
 * « Confirmer » of « Qui produit ? » (the project's owner, proto pqset):
 * opens the deliverable's production when it is not yet — with how its
 * preproduction is organised —, then records who produces it. The roles
 * already given stay; the budget validation falls to the organisation's
 * validator until « Qui fait quoi » names another. The company becomes
 * the executive production; its private link is made in « Qui fait quoi ».
 */
export async function chooseProducer(
  input: z.input<typeof schema>,
): Promise<PrepResult> {
  const access = await requireApproved();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return {
      ok: false,
      error:
        field === "mode"
          ? t.errors.mode
          : field === "organization"
            ? t.errors.kind
            : fr.productionPrep.errors.invalid,
    };
  }
  const p = parsed.data;
  if (p.organization === "external" && !p.companyContactId)
    return { ok: false, error: t.errors.company };

  const supabase = await createClient();
  const [{ data: deliverable }, { data: existing }] = await Promise.all([
    supabase
      .from("strategy_deliverables")
      .select("title")
      .eq("id", p.deliverableId)
      .maybeSingle(),
    supabase
      .from("production_sheets")
      .select(
        "id, line_producer_person_id, quote_validator_person_id, dop_person_id, dop_contact_id",
      )
      .eq("deliverable_id", p.deliverableId)
      .maybeSingle(),
  ]);
  const kind = t.kinds[p.organization].label;
  return withOutcome(
    p.projectId,
    ["marketing"],
    t.done(deliverable?.title ?? "", kind),
    async () => {
      // Opens the sheet, or changes how its preproduction is organised.
      const { data: sheetId, error: openError } = await supabase.rpc(
        "open_production_sheet",
        { p_deliverable_id: p.deliverableId, p_mode: p.mode },
      );
      if (openError || !sheetId) return prepFailure(openError ?? {});
      const validator =
        existing?.quote_validator_person_id ??
        (access.organizationId
          ? ((await loadValidators(access.organizationId))[0]?.personId ?? null)
          : null);
      const { error } = await supabase.rpc("set_production_organization", {
        p_sheet_id: sheetId,
        p_organization: p.organization,
        p_company_contact_id:
          p.organization === "external" ? p.companyContactId : null,
        p_line_producer_person_id: existing?.line_producer_person_id ?? null,
        p_quote_validator_person_id: validator ?? access.personId ?? "",
        p_dop_person_id: existing?.dop_person_id ?? null,
        p_dop_contact_id: existing?.dop_contact_id ?? null,
      });
      if (error) {
        if (error.message?.includes("company_required"))
          return { ok: false, error: t.errors.company };
        return prepFailure(error);
      }
      await schedulePendingPushes();
      return prepDone(p.projectId);
    },
  );
}
