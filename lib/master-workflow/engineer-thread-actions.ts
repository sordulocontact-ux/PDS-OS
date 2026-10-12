"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";
import { delayImpact } from "@/lib/master-workflow/delay-impact";
import { createClient } from "@/lib/supabase/server";

// The team's side of the thread with the engineer (PROJ-AMEL-02): answer,
// handle a signal, apply the dates a delay touches. RLS: the project's
// owner; the Brief's calendar order is checked in SQL.

type Result = { ok: true } | { ok: false; error: string };

const id = z.uuid();
const t = fr.masterWorkflow.engineerThread;

const COLUMN = {
  mixV1Due: "mix_v1_due",
  mixFinalDue: "mix_final_due",
  masteringDue: "mastering_due",
  masterFinalDue: "master_final_due",
} as const;

function refresh(projectId: string) {
  revalidatePath(routes.project(projectId), "layout");
}

/** « Répondre »: a message the engineer reads on their page. */
export async function replyToEngineer(
  projectId: string,
  transmissionId: string,
  body: string,
): Promise<Result> {
  const b = z.string().trim().min(1).max(2000).safeParse(body);
  if (!id.safeParse(projectId).success || !id.safeParse(transmissionId).success)
    return { ok: false, error: t.failed };
  if (!b.success) return { ok: false, error: t.invalid };
  const access = await requireApproved();
  if (!access.organizationId) return { ok: false, error: t.failed };
  const supabase = await createClient();
  const { data: sending } = await supabase
    .from("master_transmissions")
    .select("role")
    .eq("id", transmissionId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!sending) return { ok: false, error: t.failed };
  const { error } = await supabase.from("master_engineer_messages").insert({
    organization_id: access.organizationId,
    project_id: projectId,
    transmission_id: transmissionId,
    stage: sending.role,
    kind: "message",
    author: "team",
    body: b.data,
  });
  if (error) {
    console.error("replyToEngineer:", error.message);
    return {
      ok: false,
      error: error.code === "42501" ? fr.auth.errors.forbidden : t.failed,
    };
  }
  refresh(projectId);
  return { ok: true };
}

/** « Marquer comme traité » or « Rouvrir » a signal. */
export async function setSignalStatus(
  projectId: string,
  messageId: string,
  status: "open" | "handled",
): Promise<Result> {
  if (!id.safeParse(projectId).success || !id.safeParse(messageId).success)
    return { ok: false, error: t.failed };
  await requireApproved();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("master_engineer_messages")
    .update({ status })
    .eq("id", messageId)
    .eq("project_id", projectId)
    .select("id");
  if (error || !data?.length) {
    if (error) console.error("setSignalStatus:", error.message);
    return { ok: false, error: t.failed };
  }
  refresh(projectId);
  return { ok: true };
}

/**
 * « Appliquer ces dates »: the Brief's dates the delay touches, computed
 * again here by the code (never sent by the browser), moved, and the delay
 * handled.
 */
export async function applyDelayDates(
  projectId: string,
  messageId: string,
): Promise<Result> {
  if (!id.safeParse(projectId).success || !id.safeParse(messageId).success)
    return { ok: false, error: t.failed };
  await requireApproved();
  const supabase = await createClient();
  const [{ data: message }, { data: brief }, { data: release }] =
    await Promise.all([
      supabase
        .from("master_engineer_messages")
        .select("stage, delay_days")
        .eq("id", messageId)
        .eq("project_id", projectId)
        .eq("kind", "delay")
        .maybeSingle(),
      supabase
        .from("master_briefs")
        .select(
          "id, mix_v1_due, mix_final_due, mastering_due, master_final_due",
        )
        .eq("project_id", projectId)
        .maybeSingle(),
      supabase
        .from("releases")
        .select("planned_release_date")
        .eq("project_id", projectId)
        .order("created_at")
        .limit(1)
        .maybeSingle(),
    ]);
  if (!message?.delay_days || !brief) return { ok: false, error: t.failed };
  const { impacts } = delayImpact({
    stage: message.stage === "mastering" ? "mastering" : "mix",
    days: message.delay_days,
    dates: {
      mixV1Due: brief.mix_v1_due,
      mixFinalDue: brief.mix_final_due,
      masteringDue: brief.mastering_due,
      masterFinalDue: brief.master_final_due,
    },
    today: todayInParis(),
    releaseDate: release?.planned_release_date ?? null,
  });
  if (impacts.length > 0) {
    const moved: Partial<Record<(typeof COLUMN)[keyof typeof COLUMN], string>> =
      {};
    for (const impact of impacts) moved[COLUMN[impact.key]] = impact.to;
    const { error } = await supabase
      .from("master_briefs")
      .update(moved)
      .eq("id", brief.id);
    if (error) {
      console.error("applyDelayDates:", error.message);
      return { ok: false, error: t.failed };
    }
  }
  return setSignalStatus(projectId, messageId, "handled");
}
