"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import { loadAgreements } from "@/lib/legal/contracts/queries";
import { getProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";

// The project's side of the agreements (ticket Juridique 03). People,
// roles and values are found again on the server from the project's
// sources, never taken from the browser: the browser only says which
// person, which template, which fee.

export type AgreementActionResult =
  { ok: true; contractId?: string } | { ok: false; error: string };

const mappingSchema = z.object({
  projectId: catalogIdSchema,
  items: z
    .array(
      z.object({
        key: z.string().min(1).max(400),
        needed: z.boolean(),
        templateId: catalogIdSchema.nullable(),
        feeCents: z.number().int().positive().max(100_000_000).nullable(),
      }),
    )
    .max(200),
});

async function loadFor(projectId: string) {
  const access = await requireApproved();
  if (!can(access, "manage_legal")) return null;
  const project = await getProject(projectId);
  if (!project) return null;
  return { project, agreements: await loadAgreements(project, access) };
}

function errorOf(message: string): string {
  const t = fr.legalContracts.agreements.errors;
  if (message.includes("contract_fields_missing")) return t.missing;
  if (message.includes("template_not_validated")) return t.template;
  if (message.includes("mapping_template_not_validated")) return t.template;
  if (message.includes("mapping_template_incompatible")) return t.incompatible;
  if (message.includes("agreement_already_generated")) return t.already;
  return t.failed;
}

/** « Justine valide ou corrige la cartographie en une fois ». */
export async function approveContractMapping(
  input: z.input<typeof mappingSchema>,
): Promise<AgreementActionResult> {
  const parsed = mappingSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: fr.legalContracts.agreements.errors.fee };
  const loaded = await loadFor(parsed.data.projectId);
  if (!loaded) return { ok: false, error: fr.auth.errors.forbidden };

  const items = parsed.data.items.flatMap((item) => {
    const row = loaded.agreements.rows.find((r) => r.key === item.key);
    if (!row?.contactId || row.contract) return [];
    return [
      {
        contact_id: row.contactId,
        needed: item.needed,
        roles: row.formRoles,
        template_id: item.templateId,
        fee_cents: item.feeCents,
      },
    ];
  });
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_contract_mapping", {
    p_project_id: loaded.project.id,
    p_items: items,
  });
  if (error) {
    console.error("approveContractMapping:", error.message);
    return { ok: false, error: errorOf(error.message) };
  }
  revalidatePath(routes.projectLegal(loaded.project.id), "layout");
  return { ok: true };
}

/** « PO duplique le template compatible » once every value is there. */
export async function generateLegalContract(
  projectId: string,
  needId: string,
): Promise<AgreementActionResult> {
  const id = catalogIdSchema.safeParse(projectId);
  const need = catalogIdSchema.safeParse(needId);
  if (!id.success || !need.success)
    return { ok: false, error: fr.auth.errors.forbidden };
  const loaded = await loadFor(id.data);
  if (!loaded) return { ok: false, error: fr.auth.errors.forbidden };
  const row = loaded.agreements.rows.find((r) => r.needId === need.data);
  if (!row) return { ok: false, error: fr.auth.errors.forbidden };
  if (row.state !== "ready_to_generate")
    return { ok: false, error: errorOf("contract_fields_missing") };

  const sources = fr.legalContracts.sources;
  const fields = Object.fromEntries(
    row.fields.map((f) => [
      f.id,
      { value: f.value, source: f.source ? sources[f.source] : "" },
    ]),
  );
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_legal_contract", {
    p_need_id: need.data,
    p_fields: fields,
  });
  if (error || !data) {
    if (error) console.error("generateLegalContract:", error.message);
    return { ok: false, error: errorOf(error?.message ?? "") };
  }
  revalidatePath(routes.projectLegal(loaded.project.id), "layout");
  revalidatePath(routes.contracts, "layout");
  return { ok: true, contractId: data };
}

const reviseSchema = z.object({
  contractId: catalogIdSchema,
  body: z.string().min(1).max(200_000),
  comment: z.string().trim().min(1).max(2000),
});

/** An explicit change of clauses, kept as a new version with its reason. */
export async function reviseContractDocument(
  input: z.input<typeof reviseSchema>,
): Promise<AgreementActionResult> {
  const t = fr.legalContracts;
  const parsed = reviseSchema.safeParse(input);
  await requireApproved();
  if (!parsed.success) return { ok: false, error: fr.contracts.errors.comment };
  const supabase = await createClient();
  const { error } = await supabase.rpc("revise_contract_document", {
    p_contract_id: parsed.data.contractId,
    p_body: parsed.data.body,
    p_comment: parsed.data.comment,
  });
  if (error) {
    const message = error.message ?? "";
    if (message.includes("contract_body_unchanged"))
      return { ok: false, error: t.document.unchanged };
    if (message.includes("contract_wrong_status"))
      return { ok: false, error: fr.contracts.errors.status };
    if (error.code === "42501")
      return { ok: false, error: fr.auth.errors.forbidden };
    console.error("reviseContractDocument:", message);
    return { ok: false, error: t.agreements.errors.failed };
  }
  revalidatePath(routes.contract(parsed.data.contractId));
  return { ok: true };
}
