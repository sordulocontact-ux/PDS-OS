import "server-only";

import { cache } from "react";

import { requireApproved } from "@/lib/auth/dal";
import { loadCreativeBriefs } from "@/lib/design/brief-store";
import { loadConception } from "@/lib/design/conception";
import { loadDirection } from "@/lib/design/direction";
import {
  designJourney,
  type DirectionPhase,
  type JourneySheet,
} from "@/lib/design/journey";
import { loadDesignPeople } from "@/lib/design/people";
import { sheetPhase, type SheetPhaseView } from "@/lib/design/sheet-phase";
import { loadFacts, type SheetFacts } from "@/lib/design/sheets";
import { getProject } from "@/lib/projects/queries";
import { isStageValidated, personName } from "@/lib/projects/types";
import { byProjectVersion } from "@/lib/projects/version-cache";
import { createClient } from "@/lib/supabase/server";
import type { JourneyPerson } from "@/lib/ui/journey";
import { formatShortInstant } from "@/lib/utils/day";
import { allInOrder } from "@/lib/utils/parallel";

/** The creative exchange of the Conception (design_calls), the latest. */
async function loadDesignCall(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("design_calls")
    .select(
      "created_at, call:calls!inner(id, occurred_at, status, audio_path, call_reports(id))",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) console.error("[design] creative call:", error.message);
  if (!data?.call) return null;
  return {
    callId: data.call.id,
    occurredAt: data.call.occurred_at,
    recorded: Boolean(data.call.audio_path) || data.call.status !== "draft",
    held: (data.call.call_reports ?? []).length > 0,
  };
}
export type DesignCallInfo = NonNullable<
  Awaited<ReturnType<typeof loadDesignCall>>
>;

/** The start of the Conception and the Brief de sortie it starts from. */
async function loadStart(projectId: string) {
  const supabase = await createClient();
  const [workspace, strategy, assignment] = await Promise.all([
    supabase
      .from("design_workspaces")
      .select("start_path, start_path_by, start_path_at, started_at")
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase
      .from("strategy_documents")
      .select("version, decided_at")
      .eq("project_id", projectId)
      .eq("kind", "brief")
      .eq("state", "approved")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("design_assignments")
      .select("assigned_by")
      .eq("project_id", projectId)
      .eq("scope", "direction")
      .is("ended_at", null)
      .maybeSingle(),
  ]);
  const w = workspace.data;
  const path: "direct" | "call" | null =
    w?.start_path === "direct" || w?.start_path === "call"
      ? w.start_path
      : null;
  return {
    path,
    pathBy: w?.start_path_by ?? null,
    pathAt: w?.start_path_at ?? null,
    strategy: strategy.data
      ? { version: strategy.data.version, at: strategy.data.decided_at }
      : null,
    creativeBy: assignment.data?.assigned_by ?? null,
  };
}

/** A sheet's phase (lib/design/sheet-phase.ts) from what was read. */
export function phaseOf(f: SheetFacts): SheetPhaseView {
  const decided = f.versions.filter((v) => v.status !== "withdrawn");
  const lastEdit = [
    f.sheet.updated_at,
    ...f.items.map((i) => i.updated_at),
  ].sort();
  return sheetPhase({
    submissions: decided.map((v) => ({
      number: v.number,
      status: v.status === "withdrawn" ? "pending" : v.status,
      at: v.decisions.at(-1)?.decidedAt ?? v.submittedAt,
    })),
    handed: f.handoffs.map((h) => h.number),
    reopenedSince: (at) =>
      (f.sheet.new_version_at !== null && f.sheet.new_version_at > at) ||
      (lastEdit.at(-1) ?? "") > at,
  });
}

/**
 * Everything the six steps of the Conception share, read once per request
 * with the viewer's session: the project, what the Conception holds
 * (loadConception), its people, the direction's versions, the Brief
 * créatif, the sheets and their phase, then the journey for the person
 * looking. Null when the project cannot be read or is not launched.
 */
export const designJourneyContext = cache(
  byProjectVersion("design-context", async (projectId: string) => {
    const [access, project] = await allInOrder([
      requireApproved(),
      getProject(projectId),
    ]);
    if (!project || project.stages.length === 0) return null;
    const data = await loadConception(project, access);
    if (!data) return null;
    const [people, start, call, briefs, facts] = await Promise.all([
      loadDesignPeople(projectId, data.organizationId, access),
      loadStart(projectId),
      loadDesignCall(projectId),
      loadCreativeBriefs(projectId),
      loadFacts(projectId),
    ]);
    const direction = await loadDirection(projectId, people.members);
    const me = access.personId;
    const nameOf = (id: string | null) =>
      id ? (people.members.find((m) => m.personId === id)?.name ?? "") : "";
    const person = (id: string | null, name?: string): JourneyPerson | null =>
      id
        ? { name: name ?? nameOf(id), viewer: id === me, viaLink: false }
        : null;

    const owner = person(project.ownerPersonId, project.ownerName ?? undefined);
    const creative = people.direction.responsible
      ? person(people.direction.responsible.personId)
      : null;
    const validatorMember = people.direction.validators[0] ?? null;
    const validator = validatorMember ? person(validatorMember.personId) : null;
    const latestDirection =
      direction.submissions.find((s) => s.status !== "withdrawn") ?? null;
    const directionPhase: DirectionPhase =
      !latestDirection || latestDirection.status === "withdrawn"
        ? "draft"
        : latestDirection.status;

    const sheets = facts.map((f) => {
      const phase = phaseOf(f);
      const responsible = people.sheets[f.sheet.id]?.responsible ?? null;
      return {
        facts: f,
        phase,
        responsible,
        validators: people.sheets[f.sheet.id]?.validators ?? [],
      };
    });
    const journeySheets: JourneySheet[] = sheets.map((s) => ({
      id: s.facts.sheet.id,
      title: s.facts.sheet.title,
      responsible: s.responsible ? person(s.responsible.personId) : null,
      phase: s.phase.phase,
      version: s.phase.version,
      transferred: s.phase.transferred,
    }));
    const strategyValidated = isStageValidated(
      project.stages,
      "launch_strategy",
    );
    const steps = designJourney({
      projectId,
      strategy: {
        validated: strategyValidated,
        version: start.strategy?.version ?? null,
        at: start.strategy ? formatShortInstant(start.strategy.at ?? "") : null,
      },
      owner,
      creative,
      validator,
      path: start.path,
      call: call ? { occurredAt: call.occurredAt, held: call.held } : null,
      intentions: {
        proposed: data.intentions.filter((i) => i.status === "proposed").length,
        confirmed: data.intentions.filter((i) => i.status === "confirmed")
          .length,
      },
      references: {
        total: data.references.length,
        unattached: data.references.filter((r) => r.links.length === 0).length,
      },
      direction: directionPhase,
      brief: briefs[0]?.number ?? null,
      sheets: journeySheets,
    });
    const isOwner = me !== null && project.ownerPersonId === me;
    return {
      access,
      project,
      data,
      people,
      start,
      call,
      briefs,
      direction,
      latestDirection,
      directionPhase,
      sheets,
      journeySheets,
      owner,
      creative,
      validator,
      isOwner,
      isCreative: creative?.viewer ?? false,
      isValidator: people.direction.validators.some((v) => v.personId === me),
      viewerName:
        personName(access.firstName ?? "", access.lastName ?? "") || null,
      nameOf,
      steps,
    };
  }),
);

export type DesignJourneyContext = NonNullable<
  Awaited<ReturnType<typeof designJourneyContext>>
>;
