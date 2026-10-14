"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { MIX_FEEDBACK_INSTRUCTIONS } from "@/lib/ai/instructions/mix-feedback";
import { extract } from "@/lib/ai/llm";
import { aiQuotaMessage } from "@/lib/ai/quota";
import { mixFeedbackSchema } from "@/lib/ai/schemas/mix-feedback";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { checkSummary } from "@/lib/master-workflow/summary-check";
import { MIX_DECISIONS } from "@/lib/master-workflow/mix-types";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

export type MixResult = { ok: true } | { ok: false; error: string };

const ids = z.object({ projectId: z.uuid(), versionId: z.uuid() });
const t = fr.masterWorkflow.mixVersions.errors;

function refresh(projectId: string) {
  revalidatePath(routes.projectMasterStep(projectId, "mix"));
}

/**
 * A comment of a member who sees the project (RLS), with its timecode. The
 * browser's key makes it idempotent (PROJ-BUG-08): a request sent twice
 * adds the comment once, the second answer is a success.
 */
export async function addMixComment(
  projectId: string,
  versionId: string,
  body: string,
  timecodeSeconds: number | null,
  clientKey: string,
): Promise<MixResult> {
  const input = ids
    .extend({
      body: z.string().trim().min(1).max(2000),
      timecodeSeconds: z.number().int().min(0).max(86399).nullable(),
      clientKey: z.uuid(),
    })
    .safeParse({ projectId, versionId, body, timecodeSeconds, clientKey });
  const access = await requireApproved();
  if (!input.success || !access.organizationId)
    return { ok: false, error: t.comment };
  const supabase = await createClient();
  const { error } = await supabase.from("master_mix_comments").insert({
    organization_id: access.organizationId,
    project_id: input.data.projectId,
    version_id: input.data.versionId,
    body: input.data.body,
    timecode_seconds: input.data.timecodeSeconds,
    client_key: input.data.clientKey,
  });
  if (error?.code === "23505") {
    refresh(input.data.projectId);
    return { ok: true };
  }
  if (error) {
    console.error("addMixComment:", error.code, error.message);
    return {
      ok: false,
      error: error.code === "42501" ? t.forbidden : t.comment,
    };
  }
  refresh(input.data.projectId);
  return { ok: true };
}

/** The owner's synthesis, editable until it is sent (RLS). */
export async function saveMixSummary(
  projectId: string,
  versionId: string,
  summary: string,
): Promise<MixResult> {
  const input = ids
    .extend({ summary: z.string().trim().max(4000) })
    .safeParse({ projectId, versionId, summary });
  await requireApproved();
  if (!input.success) return { ok: false, error: t.summary };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("master_mix_versions")
    .update({ feedback_summary: input.data.summary || null })
    .eq("id", input.data.versionId)
    .eq("project_id", input.data.projectId)
    .select("id");
  if (error || !data?.length) {
    if (error) console.error("saveMixSummary:", error.message);
    return { ok: false, error: t.forbidden };
  }
  refresh(input.data.projectId);
  return { ok: true };
}

/** Sends the saved synthesis to the engineer, once (send_mix_feedback). */
export async function sendMixFeedback(
  projectId: string,
  versionId: string,
): Promise<MixResult> {
  const input = ids.safeParse({ projectId, versionId });
  await requireApproved();
  if (!input.success) return { ok: false, error: t.send };
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_mix_feedback", {
    p_version_id: input.data.versionId,
  });
  if (error) {
    console.error("sendMixFeedback:", error.code, error.message);
    return {
      ok: false,
      error:
        error.code === "42501"
          ? t.forbidden
          : error.message.includes("no_summary")
            ? t.noSummary
            : t.send,
    };
  }
  refresh(input.data.projectId);
  return { ok: true };
}

/**
 * PO's synthesis of the comments, proposed to the owner (never written: it
 * fills the field, the owner edits, saves and sends). The comments travel
 * as data in the user message, never in the system prompt (rule 4).
 */
export async function proposeMixSummary(
  projectId: string,
  versionId: string,
): Promise<
  | { ok: true; summary: string; note: string | null }
  | { ok: false; error: string }
> {
  const input = ids.safeParse({ projectId, versionId });
  await requireApproved();
  if (!input.success) return { ok: false, error: t.propose };
  const supabase = await createClient();
  const [owner, version, comments] = await Promise.all([
    supabase.rpc("is_project_owner", { p_project_id: input.data.projectId }),
    supabase
      .from("master_mix_versions")
      .select("number, master_id")
      .eq("id", input.data.versionId)
      .maybeSingle(),
    supabase
      .from("master_mix_comments")
      .select(
        "body, author:people!master_mix_comments_created_by_fkey(first_name, last_name)",
      )
      .eq("version_id", input.data.versionId)
      .order("created_at"),
  ]);
  if (!owner.data) return { ok: false, error: t.forbidden };
  if (!version.data || !comments.data?.length)
    return { ok: false, error: t.noComment };
  const { data: master } = await supabase
    .from("masters")
    .select("title")
    .eq("id", version.data.master_id)
    .maybeSingle();

  const lines = comments.data
    .map((row) => {
      const author = row.author
        ? personName(row.author.first_name, row.author.last_name)
        : "?";
      return `- ${author} : ${row.body.replace(/\s+/g, " ")}`;
    })
    .join("\n");
  try {
    const { output } = await extract(
      mixFeedbackSchema,
      `<titre>${master?.title ?? ""}</titre>\n<version>V${version.data.number}</version>\n<commentaires>\n${lines}\n</commentaires>`,
      MIX_FEEDBACK_INSTRUCTIONS,
    );
    // The measures said are kept, none is added, no remark of PO's own
    // reaches the engineer (lib/master-workflow/summary-check.ts).
    const checked = checkSummary(
      output.summary.replace(/\*\*|__/g, "").trim(),
      comments.data.map((row) => row.body),
    );
    const summary = checked.summary.trim();
    return summary
      ? {
          ok: true,
          summary: summary.slice(0, 4000),
          note:
            checked.restored + checked.removed > 0
              ? fr.masterWorkflow.mixVersions.summaryChecked(
                  checked.restored,
                  checked.removed,
                )
              : null,
        }
      : { ok: false, error: t.propose };
  } catch (error) {
    console.error("proposeMixSummary:", error);
    return { ok: false, error: aiQuotaMessage(error) ?? t.propose };
  }
}

/**
 * The validator's decision on the latest version of a title: "approved"
 * makes it the Mix final, for good; "changes_requested" waits for the next
 * version. The database checks who decides, that the version is the latest
 * and undecided, and that a Mix final is never replaced (decide_mix_version).
 */
export async function decideMixVersion(
  projectId: string,
  versionId: string,
  decision: string,
  note: string,
): Promise<MixResult> {
  const input = ids
    .extend({
      decision: z.enum(MIX_DECISIONS),
      note: z.string().max(2000),
    })
    .safeParse({ projectId, versionId, decision, note });
  await requireApproved();
  if (!input.success) return { ok: false, error: t.decide };
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_mix_version", {
    p_version_id: input.data.versionId,
    p_decision: input.data.decision,
    p_note: input.data.note,
  });
  if (error) {
    console.error("decideMixVersion:", error.code, error.message);
    const known = [
      "already_decided",
      "not_latest",
      "already_final",
      "note_required",
    ].find((code) => error.message.includes(code));
    return {
      ok: false,
      error:
        error.code === "42501"
          ? t.forbidden
          : known
            ? t.decisionRefused[known as keyof typeof t.decisionRefused]
            : t.decide,
    };
  }
  refresh(input.data.projectId);
  return { ok: true };
}

/**
 * « Utiliser ce mix comme mix final » (PROJ-BUG-06): an existing « Mix »
 * file of the Catalogue becomes the title's Mix final, once, without a new
 * mixing round; the database checks the owner, the file and that the title
 * has no Mix final yet (declare_mix_final).
 */
export async function declareMixFinal(
  projectId: string,
  masterId: string,
  fileId: string,
  note: string,
): Promise<MixResult> {
  const input = z
    .object({
      projectId: z.uuid(),
      masterId: z.uuid(),
      fileId: z.uuid(),
      note: z.string().trim().max(2000),
    })
    .safeParse({ projectId, masterId, fileId, note });
  await requireApproved();
  if (!input.success) return { ok: false, error: t.decide };
  const supabase = await createClient();
  const { error } = await supabase.rpc("declare_mix_final", {
    p_project_id: input.data.projectId,
    p_master_id: input.data.masterId,
    p_file_id: input.data.fileId,
    p_note: input.data.note || undefined,
  });
  if (error) {
    console.error("declareMixFinal:", error.code, error.message);
    return {
      ok: false,
      error:
        error.code === "42501"
          ? t.forbidden
          : error.message.includes("already_final")
            ? t.decisionRefused.already_final
            : error.message.includes("already_a_version")
              ? t.alreadyVersion
              : t.decide,
    };
  }
  revalidatePath(routes.projectMaster(input.data.projectId), "layout");
  return { ok: true };
}
