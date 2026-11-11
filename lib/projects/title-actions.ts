"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// The four gestures on the titles of a collective (docs/pds-mic-plan.md,
// lot 2). The database decides who may (add/rename/abandon/
// reactivate_project_title: the owner once launched, who creates projects
// before) and keeps the history; these only check the shape of the input.

const idSchema = z.uuid();
const nameSchema = z.string().trim().max(200).nullable();
const reasonSchema = z.string().trim().min(1).max(2000);

type RpcError = { code?: string; message: string };

function titleError(where: string, error: RpcError): string {
  const t = fr.projectTitles.errors;
  const message = error.message;
  if (error.code === "42501") return fr.auth.errors.forbidden;
  if (message.includes("not_collective")) return t.notCollective;
  if (
    message.includes("title_not_found") ||
    message.includes("project_not_found")
  )
    return t.notFound;
  if (message.includes("working_title_too_long")) return t.tooLong;
  if (message.includes("reason_required")) return t.reasonRequired;
  if (message.includes("reason_too_long")) return t.reasonTooLong;
  if (message.includes("title_already_in_project")) return t.alreadyInProject;
  if (message.includes("master_not_found")) return t.masterNotFound;
  if (message.includes("single_requires_one_master")) return t.singleOneMaster;
  if (message.includes("title_not_abandoned")) return t.notAbandoned;
  if (message.includes("title_abandoned")) return t.abandoned;
  console.error(`${where}:`, message);
  return t.failed;
}

// The overview lists them, the Activité tells their history.
function refresh(projectId: string) {
  revalidatePath(routes.project(projectId), "layout");
}

/** « Ajouter un titre »: a working title or none, a master of the Catalogue
 * or none yet. */
export async function addProjectTitle(input: {
  projectId: string;
  workingTitle: string | null;
  masterId: string | null;
}): Promise<WriteResult> {
  const t = fr.projectTitles.errors;
  await requireApproved();
  const projectId = idSchema.safeParse(input.projectId);
  const name = nameSchema.safeParse(input.workingTitle);
  const masterId = idSchema.nullable().safeParse(input.masterId || null);
  if (!projectId.success || !masterId.success)
    return { ok: false, error: t.failed };
  if (!name.success) return { ok: false, error: t.tooLong };

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_project_title", {
    p_project_id: projectId.data,
    ...(name.data ? { p_working_title: name.data } : {}),
    ...(masterId.data ? { p_master_id: masterId.data } : {}),
  });
  if (error) return { ok: false, error: titleError("addProjectTitle", error) };
  refresh(projectId.data);
  return { ok: true };
}

/** « Renommer »: empty takes the title back to « sans nom » (or to its
 * master's title). */
export async function renameProjectTitle(input: {
  projectId: string;
  titleId: string;
  workingTitle: string;
}): Promise<WriteResult> {
  const t = fr.projectTitles.errors;
  await requireApproved();
  const projectId = idSchema.safeParse(input.projectId);
  const titleId = idSchema.safeParse(input.titleId);
  const name = nameSchema.safeParse(input.workingTitle);
  if (!projectId.success || !titleId.success)
    return { ok: false, error: t.failed };
  if (!name.success) return { ok: false, error: t.tooLong };

  const supabase = await createClient();
  const { error } = await supabase.rpc("rename_project_title", {
    p_title_id: titleId.data,
    p_working_title: name.data ?? "",
  });
  if (error)
    return { ok: false, error: titleError("renameProjectTitle", error) };
  refresh(projectId.data);
  return { ok: true };
}

/** « Abandonner », with its reason: nothing is removed. */
export async function abandonProjectTitle(input: {
  projectId: string;
  titleId: string;
  reason: string;
}): Promise<WriteResult> {
  const t = fr.projectTitles.errors;
  await requireApproved();
  const projectId = idSchema.safeParse(input.projectId);
  const titleId = idSchema.safeParse(input.titleId);
  const reason = reasonSchema.safeParse(input.reason);
  if (!projectId.success || !titleId.success)
    return { ok: false, error: t.failed };
  if (!reason.success)
    return {
      ok: false,
      error: input.reason.trim() ? t.reasonTooLong : t.reasonRequired,
    };

  const supabase = await createClient();
  const { error } = await supabase.rpc("abandon_project_title", {
    p_title_id: titleId.data,
    p_reason: reason.data,
  });
  if (error)
    return { ok: false, error: titleError("abandonProjectTitle", error) };
  refresh(projectId.data);
  return { ok: true };
}

/** « Réactiver »: the title comes back as it was. */
export async function reactivateProjectTitle(input: {
  projectId: string;
  titleId: string;
}): Promise<WriteResult> {
  const t = fr.projectTitles.errors;
  await requireApproved();
  const projectId = idSchema.safeParse(input.projectId);
  const titleId = idSchema.safeParse(input.titleId);
  if (!projectId.success || !titleId.success)
    return { ok: false, error: t.failed };

  const supabase = await createClient();
  const { error } = await supabase.rpc("reactivate_project_title", {
    p_title_id: titleId.data,
  });
  if (error)
    return { ok: false, error: titleError("reactivateProjectTitle", error) };
  refresh(projectId.data);
  return { ok: true };
}
