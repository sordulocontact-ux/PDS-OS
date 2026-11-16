"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";
import { delayImpact } from "@/lib/master-workflow/delay-impact";
import { emailEngineer } from "@/lib/master-workflow/engineer-email";
import { masterRound } from "@/lib/i18n/fr/master-round";
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
  const stage = sending.role === "mastering" ? "mastering" : "mix";
  await emailEngineer(projectId, stage, (title) => ({
    subject: masterRound.notify.reply.subject(title),
    body: masterRound.notify.reply.body,
    anchor: "ps-thread",
  }));
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
 * « Appliquer ces dates » (the owner, or the direction once the delay was
 * sent to them): the Brief's dates the delay touches, computed again here
 * by the code (never sent by the browser), moved by apply_master_delay,
 * the engineer answered and the delay handled.
 */
export async function applyDelayDates(
  projectId: string,
  messageId: string,
  reply = "",
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
      // « The » release date (lot 13): a collective's earliest release.
      supabase
        .rpc("next_release_date", { p_project_id: projectId })
        .then(({ data, error }) => ({
          data: { planned_release_date: data ?? null },
          error,
        })),
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
  const moved: Partial<Record<(typeof COLUMN)[keyof typeof COLUMN], string>> =
    {};
  for (const impact of impacts) moved[COLUMN[impact.key]] = impact.to;
  const { error } = await supabase.rpc("apply_master_delay", {
    p_message_id: messageId,
    p_dates: moved,
    p_reply: reply.trim() || null,
  });
  const result = done(projectId, error, "applyDelayDates");
  if (result.ok) await emailDelayAnswer(projectId, messageId);
  return result;
}

function done(
  projectId: string,
  error: { message: string; code?: string } | null,
  where: string,
): Result {
  const d = fr.masterDelay.errors;
  if (error) {
    console.error(`${where}:`, error.message);
    return {
      ok: false,
      error:
        error.code === "42501"
          ? d.forbidden
          : error.message.includes("reply_required")
            ? d.replyRequired
            : error.message.includes("master_briefs")
              ? d.order
              : t.failed,
    };
  }
  refresh(projectId);
  return { ok: true };
}

/** « Envoyer à la direction »: the Master final would pass the release. */
export async function escalateDelay(
  projectId: string,
  messageId: string,
): Promise<Result> {
  if (!id.safeParse(projectId).success || !id.safeParse(messageId).success)
    return { ok: false, error: t.failed };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("escalate_master_delay", {
    p_message_id: messageId,
  });
  return done(projectId, error, "escalateDelay");
}

/** « Garder les dates » (owner) or « Refuser le retard » (direction),
 * saying why to the engineer. */
export async function keepDelayDates(
  projectId: string,
  messageId: string,
  reply: string,
): Promise<Result> {
  if (!id.safeParse(projectId).success || !id.safeParse(messageId).success)
    return { ok: false, error: t.failed };
  if (!reply.trim())
    return { ok: false, error: fr.masterDelay.errors.replyRequired };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("keep_master_dates", {
    p_message_id: messageId,
    p_reply: reply.trim().slice(0, 2000),
  });
  const result = done(projectId, error, "keepDelayDates");
  if (result.ok) await emailDelayAnswer(projectId, messageId);
  return result;
}

/** The engineer learns by e-mail that their delay was answered. */
async function emailDelayAnswer(projectId: string, messageId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("master_engineer_messages")
    .select("stage")
    .eq("id", messageId)
    .maybeSingle();
  if (!data) return;
  await emailEngineer(
    projectId,
    data.stage === "mastering" ? "mastering" : "mix",
    (title) => ({
      subject: masterRound.notify.delay.subject(title),
      body: masterRound.notify.delay.body,
      anchor: "ps-thread",
    }),
  );
}
