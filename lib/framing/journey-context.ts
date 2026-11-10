import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";

import { requireApproved } from "@/lib/auth/dal";
import { assessFraming } from "@/lib/framing/assess";
import { framingJourney } from "@/lib/framing/journey";
import { framingStarted, loadFramingKnowledge } from "@/lib/framing/knowledge";
import { toVerify } from "@/lib/framing/verify";
import { projectPlanRow } from "@/lib/plan/queries";
import { canEditProject } from "@/lib/projects/edit-access";
import { getProject } from "@/lib/projects/queries";
import { personName } from "@/lib/projects/types";
import { byProjectVersion } from "@/lib/projects/version-cache";
import { createClient } from "@/lib/supabase/server";
import { allInOrder } from "@/lib/utils/parallel";

export type FramingCallInfo = {
  callId: string;
  occurredAt: string;
  createdAt: string;
  // Its objective (framing_calls.purpose), in the planned call's block.
  goal: string;
  // Recorded or processed: its page carries the pipeline.
  recorded: boolean;
  // Its report exists: PO proposed what was said.
  reported: boolean;
  // Its transcription or its report failed: the owner relaunches it.
  failed: boolean;
};

/** The project's framing call (framing_calls), the latest prepared. */
async function loadFramingCall(
  projectId: string,
): Promise<FramingCallInfo | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("framing_calls")
    .select(
      "created_at, purpose, call:calls!inner(id, occurred_at, status, audio_path, call_reports(id))",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) console.error("[framing] framing call:", error.message);
  if (!data?.call) return null;
  return {
    callId: data.call.id,
    occurredAt: data.call.occurred_at,
    createdAt: data.created_at,
    goal: data.purpose,
    recorded: Boolean(data.call.audio_path) || data.call.status !== "draft",
    reported: (data.call.call_reports ?? []).length > 0,
    failed: data.call.status === "failed",
  };
}

/** When the plan was launched, and by whom (project_plans). */
async function loadPlanLaunch(projectId: string) {
  const { data } = await projectPlanRow(projectId);
  return data
    ? {
        launchedAt: data.launched_at,
        launchedBy: data.launcher
          ? personName(data.launcher.first_name, data.launcher.last_name)
          : null,
      }
    : null;
}

/**
 * Everything the four steps of the Cadrage share, read once per request:
 * access, the project, what PO knows (FramingKnowledge and its
 * assessment), the framing call, the plan, and the journey for the person
 * looking. Null when the project cannot be read or is not launched.
 */
export const framingJourneyContext = trackedCache(
  byProjectVersion("framing-context", async (projectId: string) => {
    const [access, project] = await allInOrder([
      requireApproved(),
      getProject(projectId),
    ]);
    if (!project || project.stages.length === 0) return null;
    const [k, call, plan] = await Promise.all([
      loadFramingKnowledge(projectId, access),
      loadFramingCall(projectId),
      loadPlanLaunch(projectId),
    ]);
    if (!k) return null;
    const assessment = assessFraming(k);
    // PO's proposals checked in the list, apart from the box's questions.
    const verify = toVerify(assessment, k);
    const verified = new Set(verify.map((q) => q.key));
    const stage = k.framing.stage?.state ?? "not_started";
    const canEdit = canEditProject(access, project);
    const viewerName =
      personName(access.firstName ?? "", access.lastName ?? "") || null;
    const pending = k.framing.pendingValidation;
    const validatorMember = pending
      ? { personId: pending.validatorPersonId, name: pending.validatorName }
      : (k.framing.validators[0] ?? null);
    const latest = k.briefs[0] ?? null;
    const steps = framingJourney({
      projectId,
      owner: project.ownerPersonId
        ? {
            name: project.ownerName ?? "—",
            viewer: project.ownerPersonId === access.personId,
            viaLink: false,
          }
        : null,
      validator: validatorMember
        ? {
            name: validatorMember.name,
            viewer: validatorMember.personId === access.personId,
            viaLink: false,
          }
        : null,
      call: call
        ? {
            occurredAt: call.occurredAt,
            held: call.reported,
            failed: call.failed,
          }
        : null,
      startedDirect: framingStarted(k),
      stage,
      dimensions: {
        open:
          assessment.blocking.filter((q) => !verified.has(q.key)).length +
          assessment.conflicts.length,
        verify: verified.size,
        ready: assessment.ready,
        confirmed: assessment.counts.known,
      },
      brief: latest ? { version: latest.version, state: latest.state } : null,
      plan,
    });
    return {
      access,
      project,
      k,
      assessment,
      verify,
      stage,
      canEdit,
      viewerName,
      validator: validatorMember,
      call,
      plan,
      steps,
    };
  }),
);

export type FramingJourneyContext = NonNullable<
  Awaited<ReturnType<typeof framingJourneyContext>>
>;
