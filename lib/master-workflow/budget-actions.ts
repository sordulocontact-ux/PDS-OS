"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { BUDGET_STATUSES } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
import { BRIEF_ROLES } from "@/lib/master-workflow/brief-proposals";
import { createClient } from "@/lib/supabase/server";

export type BudgetResult = { ok: true } | { ok: false; error: string };

const roleInput = z.object({
  projectId: z.uuid(),
  role: z.enum(BRIEF_ROLES),
});

function refresh(projectId: string) {
  revalidatePath(routes.projectMasterStep(projectId, "brief"));
  revalidatePath(routes.projectBudget(projectId));
}

/**
 * "Inscrire au budget": the brief's estimated rate of a role becomes a line
 * of the project's Budget, Estimé, linked to the role (one per role, checked
 * in SQL). The amount comes from the saved brief, never from the client.
 * Written with the owner's session (RLS).
 */
export async function addBriefRateToBudget(
  projectId: string,
  role: string,
): Promise<BudgetResult> {
  const t = fr.masterWorkflow.brief.budget;
  const input = roleInput.safeParse({ projectId, role });
  const access = await requireApproved();
  if (!input.success || !access.organizationId)
    return { ok: false, error: t.failed };

  const supabase = await createClient();
  const { data: brief } = await supabase
    .from("master_briefs")
    .select(
      "mix_rate_cents, mastering_rate_cents, mastering_same_engineer, mix:network_contacts!master_briefs_mix_contact_same_org(name), mastering:network_contacts!master_briefs_mastering_contact_same_org(name)",
    )
    .eq("project_id", input.data.projectId)
    .maybeSingle();
  const mix = input.data.role === "mix";
  const cents = mix ? brief?.mix_rate_cents : brief?.mastering_rate_cents;
  if (cents === null || cents === undefined)
    return { ok: false, error: t.noRate };
  const engineer =
    mix || brief?.mastering_same_engineer
      ? brief?.mix?.name
      : brief?.mastering?.name;

  const { error } = await supabase.from("budget_lines").insert({
    organization_id: access.organizationId,
    project_id: input.data.projectId,
    label: t.lineLabel(t.roles[input.data.role], engineer ?? null),
    amount_cents: cents,
    status: "planned",
    family: "creation_content",
    master_role: input.data.role,
  });
  if (error) {
    console.error("addBriefRateToBudget:", error.code, error.message);
    return {
      ok: false,
      error:
        error.code === "23505"
          ? t.already
          : error.code === "42501"
            ? t.forbidden
            : t.failed,
    };
  }
  refresh(input.data.projectId);
  return { ok: true };
}

/** Where the line of a role stands: Estimé, Proposé, Engagé (accepted), Payé. */
export async function setBriefBudgetStatus(
  projectId: string,
  role: string,
  status: string,
): Promise<BudgetResult> {
  const t = fr.masterWorkflow.brief.budget;
  const input = roleInput
    .extend({ status: z.enum(BUDGET_STATUSES) })
    .safeParse({ projectId, role, status });
  await requireApproved();
  if (!input.success) return { ok: false, error: t.failed };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("budget_lines")
    .update({ status: input.data.status })
    .eq("project_id", input.data.projectId)
    .eq("master_role", input.data.role)
    .select("id");
  if (error || !data?.length) {
    if (error) console.error("setBriefBudgetStatus:", error.message);
    return { ok: false, error: t.forbidden };
  }
  refresh(input.data.projectId);
  return { ok: true };
}
