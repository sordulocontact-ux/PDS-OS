"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { withOutcome } from "@/lib/journey/outcome";
import { emailEnabled } from "@/lib/email/send";
import { transmitPackage } from "@/lib/master-workflow/transmission-actions";
import { emailTransmission } from "@/lib/master-workflow/transmission-email";
import { ensureContactLink } from "@/lib/portal/ensure-contact-link";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const t = fr.masterRound;
const stageSchema = z.enum(["mix", "mastering"]);
const refresh = (projectId: string) =>
  revalidatePath(routes.projectMaster(projectId), "layout");

/**
 * « Envoyer à Karim Haddou » (or « Transmettre au mastering », « Renvoyer
 * le dossier »): the package recomputed and signed on the server
 * (transmitPackage), sent with the written reason when stems are missing.
 * The engineer's page by project (lot 11) is made if needed: that one link
 * carries the package and all else PDS expects from them (Sacha, 04/11).
 * `email`: PDS OS also sends the e-mail (the owner's message, kept as the
 * package's note, then that link) when it can (EMAIL_SMTP_*, an address in
 * the Réseau); otherwise the link is readable again in the step by the
 * owner, to copy and mark as sent.
 */
export async function sendRound(
  projectId: string,
  stage: string,
  note: string,
  withoutStemsReason: string | null,
  done: string,
  email = false,
): Promise<WriteResult> {
  const s = stageSchema.safeParse(stage);
  if (!s.success)
    return { ok: false, error: fr.masterWorkflow.mix.errors.failed };
  return withOutcome(
    projectId,
    ["master"],
    done,
    async () => {
      const result = await transmitPackage(
        projectId,
        s.data,
        note,
        withoutStemsReason,
      );
      if (!result.ok) return result;
      const link = await ensureContactLink(projectId, result.engineer.id);
      const to = result.engineer.email;
      if (email && to && emailEnabled()) {
        const access = await requireApproved();
        const sender =
          [access.firstName, access.lastName].filter(Boolean).join(" ") ||
          (access.email ?? "");
        const sent = await emailTransmission({
          projectId,
          role: s.data,
          project: result.project,
          engineer: { name: result.engineer.name, email: to },
          message: note,
          sender: { name: sender, email: access.email },
          link,
        });
        refresh(projectId);
        if (sent === "failed") return { ok: false, error: t.email.failed };
        return { ok: true };
      }
      refresh(projectId);
      return { ok: true };
    },
    { openNext: true },
  );
}

/**
 * « Marquer comme envoyé »: the owner sent the engineer's link themself
 * (no e-mail by PDS OS); the package and the page are both marked.
 */
export async function markRoundSent(
  projectId: string,
  stage: string,
  transmissionId: string,
  contactLinkId: string | null,
): Promise<WriteResult> {
  const input = z
    .object({
      projectId: z.uuid(),
      stage: stageSchema,
      transmissionId: z.uuid(),
      contactLinkId: z.uuid().nullable(),
    })
    .safeParse({ projectId, stage, transmissionId, contactLinkId });
  await requireApproved();
  if (!input.success)
    return { ok: false, error: fr.masterWorkflow.mix.errors.failed };
  const v = input.data;
  const supabase = await createClient();
  const [transmission, link] = await Promise.all([
    supabase.rpc("mark_master_transmission_sent", {
      p_transmission_id: v.transmissionId,
    }),
    v.contactLinkId
      ? supabase.rpc("mark_contact_link_sent", { p_link_id: v.contactLinkId })
      : null,
  ]);
  const error = transmission.error ?? link?.error;
  if (error) {
    console.error("markRoundSent:", error.code, error.message);
    return {
      ok: false,
      error:
        error.code === "42501"
          ? fr.masterWorkflow.mix.errors.forbidden
          : fr.masterWorkflow.mix.errors.failed,
    };
  }
  refresh(v.projectId);
  return { ok: true };
}

/**
 * « Refuser » a proposed rate, with why (rule 6): the line goes back to
 * the Brief's estimate, the engineer reads the reason on their link and
 * proposes another amount (refuse_master_rate, the owner only).
 */
export async function refuseRate(
  projectId: string,
  stage: string,
  reason: string,
): Promise<WriteResult> {
  const input = z
    .object({
      projectId: z.uuid(),
      stage: stageSchema,
      reason: z.string().trim().min(1).max(1000),
    })
    .safeParse({ projectId, stage, reason });
  await requireApproved();
  if (!input.success) return { ok: false, error: fr.dialogs.reasonRequired };
  const v = input.data;
  return withOutcome(v.projectId, ["master"], t.rate.refused, async () => {
    const supabase = await createClient();
    const { error } = await supabase.rpc("refuse_master_rate", {
      p_project_id: v.projectId,
      p_role: v.stage,
      p_reason: v.reason,
    });
    if (error) {
      console.error("refuseRate:", error.code, error.message);
      return {
        ok: false,
        error: error.message.includes("reason_required")
          ? fr.dialogs.reasonRequired
          : fr.masterBrief.errors.failed,
      };
    }
    refresh(v.projectId);
    return { ok: true };
  });
}

/** « Accepter le tarif »: the proposed amount is committed. */
export async function acceptRate(
  projectId: string,
  stage: string,
): Promise<WriteResult> {
  const s = stageSchema.safeParse(stage);
  const id = z.uuid().safeParse(projectId);
  await requireApproved();
  if (!s.success || !id.success)
    return { ok: false, error: fr.masterBrief.errors.failed };
  return withOutcome(id.data, ["master"], t.rate.accepted, async () => {
    const supabase = await createClient();
    const { error } = await supabase.rpc("accept_master_rate", {
      p_project_id: id.data,
      p_role: s.data,
    });
    if (error) {
      console.error("acceptRate:", error.code, error.message);
      return { ok: false, error: fr.masterBrief.errors.failed };
    }
    refresh(id.data);
    return { ok: true };
  });
}

const versionIds = z.object({ projectId: z.uuid(), versionId: z.uuid() });

/**
 * « Transmettre les retours sans décider »: the text, each line with its
 * author, becomes the feedback the engineer reads on the link; the version
 * stays in listening (send_mix_feedback).
 */
export async function transmitFeedback(
  projectId: string,
  versionId: string,
  text: string,
): Promise<WriteResult> {
  const input = versionIds
    .extend({ text: z.string().trim().min(1).max(4000) })
    .safeParse({ projectId, versionId, text });
  await requireApproved();
  if (!input.success) return { ok: false, error: t.transmit.error };
  const v = input.data;
  return withOutcome(v.projectId, ["master"], t.transmit.done, async () => {
    const supabase = await createClient();
    const saved = await supabase
      .from("master_mix_versions")
      .update({ feedback_summary: v.text })
      .eq("id", v.versionId)
      .eq("project_id", v.projectId)
      .select("id");
    if (saved.error || !saved.data?.length)
      return {
        ok: false,
        error: fr.masterWorkflow.mixVersions.errors.forbidden,
      };
    const { error } = await supabase.rpc("send_mix_feedback", {
      p_version_id: v.versionId,
    });
    if (error) {
      console.error("transmitFeedback:", error.code, error.message);
      return { ok: false, error: fr.masterWorkflow.mixVersions.errors.send };
    }
    refresh(v.projectId);
    return { ok: true };
  });
}

/** « Valider ce mix » / « Demander une modification » (the validator). */
export async function decideRound(
  projectId: string,
  versionId: string,
  decision: "approved" | "changes_requested",
  note: string,
  done: string,
): Promise<WriteResult> {
  const input = versionIds
    .extend({
      decision: z.enum(["approved", "changes_requested"]),
      note: z.string().max(2000),
    })
    .safeParse({ projectId, versionId, decision, note });
  await requireApproved();
  if (!input.success) return { ok: false, error: t.decision.errors.failed };
  const v = input.data;
  return withOutcome(
    v.projectId,
    ["master"],
    done,
    async () => {
      const supabase = await createClient();
      const { error } = await supabase.rpc("decide_mix_version", {
        p_version_id: v.versionId,
        p_decision: v.decision,
        p_note: v.note,
      });
      if (error) {
        console.error("decideRound:", error.code, error.message);
        const refused = fr.masterWorkflow.mixVersions.errors.decisionRefused;
        const known = (
          Object.keys(refused) as Array<keyof typeof refused>
        ).find((code) => error.message.includes(code));
        return {
          ok: false,
          error: error.message.includes("working_source")
            ? t.decision.errors.working
            : error.code === "42501"
              ? fr.masterWorkflow.mixVersions.errors.forbidden
              : known
                ? refused[known]
                : t.decision.errors.failed,
        };
      }
      refresh(v.projectId);
      return { ok: true };
    },
    { openNext: true },
  );
}

/** « Rouvrir le mix » with its reason (the owner, before the mastering). */
export async function reopenMix(
  projectId: string,
  versionId: string,
  reason: string,
  stage: "mix" | "mastering" = "mix",
): Promise<WriteResult> {
  const input = versionIds
    .extend({ reason: z.string().trim().min(1).max(2000) })
    .safeParse({ projectId, versionId, reason });
  const done = stage === "mix" ? t.reopen.done : t.reopen.master.done;
  await requireApproved();
  if (!input.success) return { ok: false, error: fr.dialogs.reasonRequired };
  const v = input.data;
  return withOutcome(v.projectId, ["master"], done, async () => {
    const supabase = await createClient();
    const { error } = await supabase.rpc("reopen_mix_version", {
      p_version_id: v.versionId,
      p_reason: v.reason,
    });
    if (error) {
      console.error("reopenMix:", error.code, error.message);
      return {
        ok: false,
        error: error.message.includes("mastering_started")
          ? t.reopen.errors.started
          : error.message.includes("distribution_delivered")
            ? t.reopen.master.delivered
            : t.reopen.errors.failed,
      };
    }
    refresh(v.projectId);
    return { ok: true };
  });
}
