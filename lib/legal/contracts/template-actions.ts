"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { CONTRACT_TYPES } from "@/lib/contracts/types";
import { fr } from "@/lib/i18n/fr";
import { unknownPlaceholders } from "@/lib/legal/contracts/fields";
import { FORM_ROLES } from "@/lib/legal/forms/definition";
import { createClient } from "@/lib/supabase/server";

// Templates are pasted by a human (« Aucun modèle juridique nouveau ni
// aucune clause n'est inventé »), never edited: a correction is a version.

export type TemplateActionResult = { ok: true } | { ok: false; error: string };

const templateSchema = z.object({
  seriesId: catalogIdSchema.nullable(),
  name: z.string().trim().min(1).max(200),
  type: z.enum(CONTRACT_TYPES),
  roles: z.array(z.enum(FORM_ROLES)).min(1).max(FORM_ROLES.length),
  usage: z.string().trim().max(500),
  body: z.string().min(1).max(200_000),
  source: z
    .object({
      path: z.string().min(1).max(500),
      name: z.string().trim().min(1).max(255),
    })
    .nullable(),
});

export async function createContractTemplate(
  input: z.input<typeof templateSchema>,
): Promise<TemplateActionResult> {
  const t = fr.legalContracts.templates;
  const access = await requireApproved();
  if (!can(access, "manage_legal") || !access.organizationId)
    return { ok: false, error: fr.auth.errors.forbidden };
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success || !parsed.data.body.trim())
    return { ok: false, error: t.form.invalid };
  const unknown = unknownPlaceholders(parsed.data.body);
  if (unknown.length > 0)
    return { ok: false, error: t.form.unknown(unknown.join(", ")) };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_contract_template", {
    p_organization_id: access.organizationId,
    p_series_id: parsed.data.seriesId,
    p_name: parsed.data.name,
    p_type: parsed.data.type,
    p_roles: parsed.data.roles,
    p_usage: parsed.data.usage || null,
    p_body: parsed.data.body,
    p_source_path: parsed.data.source?.path,
    p_source_name: parsed.data.source?.name,
  });
  if (error) {
    console.error("createContractTemplate:", error.message);
    return {
      ok: false,
      error: error.message.includes("template_source_invalid")
        ? t.source.failed
        : t.failed,
    };
  }
  revalidatePath(routes.contractTemplates);
  return { ok: true };
}

export async function setContractTemplateStatus(
  templateId: string,
  status: "validated" | "retired",
): Promise<TemplateActionResult> {
  const t = fr.legalContracts.templates;
  const id = catalogIdSchema.safeParse(templateId);
  await requireApproved();
  if (!id.success || (status !== "validated" && status !== "retired"))
    return { ok: false, error: fr.auth.errors.forbidden };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_contract_template_status", {
    p_template_id: id.data,
    p_status: status,
  });
  if (error) {
    if (error.code === "42501") return { ok: false, error: t.forbidden };
    console.error("setContractTemplateStatus:", error.message);
    return { ok: false, error: t.failed };
  }
  revalidatePath(routes.contractTemplates);
  return { ok: true };
}
