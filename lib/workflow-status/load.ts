import "server-only";

import { cache } from "react";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { loadIntake } from "@/lib/legal/intake/queries";
import { loadMarketingStanding } from "@/lib/marketing/closure/queries";
import { summarizeTracking } from "@/lib/legal/tracking/summary";
import { legalActionHref } from "@/lib/legal/plan/where";
import { loadTracking } from "@/lib/legal/tracking/queries";
import type { TrackedItem } from "@/lib/legal/tracking/state";
import { loadFinalView } from "@/lib/master-workflow/final";
import { loadMixVersions } from "@/lib/master-workflow/mix-versions";
import type { MixVersionsView } from "@/lib/master-workflow/mix-types";
import { loadStepView } from "@/lib/master-workflow/transmission";
import { isWorkflowLaunched, planLaunchedAt } from "@/lib/plan/queries";
import { fr } from "@/lib/i18n/fr";
import { getProject } from "@/lib/projects/queries";
import { REFERENCE_PLATFORMS } from "@/lib/distribution/platforms";
import { formatDate } from "@/lib/release/format";
import { createClient } from "@/lib/supabase/server";
import type { LegalStepKey } from "@/lib/ui/legal-steps";
import {
  applicableWorkflows,
  dependencies,
  distributionState,
  legalState,
  marketingState,
  masterState,
  mastersFinal,
  type Dependency,
  type DistributionFacts,
  type MasterFacts,
  type RoundFacts,
  type WorkflowKey,
  type WorkflowState,
  withDependencies,
} from "@/lib/workflow-status/rules";

type Project = NonNullable<Awaited<ReturnType<typeof getProject>>>;

export type WorkflowStates = {
  // The project's workflows, in order (from its data, ticket § 13).
  workflows: WorkflowKey[];
  // Each one's state; « restricted » for a workflow the viewer may not read.
  states: Partial<Record<WorkflowKey, WorkflowState | "restricted">>;
  // The Juridique's steps really done, for its chevrons.
  legalDone: LegalStepKey[];
  // What each workflow expects from another (lot 5), computed here.
  dependencies: Dependency[];
  // What the overview adds to the states (the Master final of its head),
  // read in the same pass: the Brief's calendar, the planned release date,
  // the Suivi's actions (empty without manage_legal).
  details: {
    masterDates: Record<string, string | null> | null;
    releaseDate: string | null;
    legalItems: TrackedItem[];
    // Rights constraints confirmed in the Cadrage: what the Plan du projet
    // calls « blocages juridiques », shown until the Juridique tracks them.
    rightsConstraints: Array<{ id: string; text: string }>;
  };
};

// Per title still open in a round, its latest version (newest first).
function openRound(
  versions: MixVersionsView,
  titleIds: Set<string>,
): Pick<RoundFacts, "finals" | "open"> {
  const titles = versions.titles.filter((t) => titleIds.has(t.masterId));
  return {
    finals: titles.filter((t) => t.finalNumber !== null).length,
    open: titles
      .filter((t) => t.finalNumber === null)
      .map((t) => {
        const latest = t.versions[0];
        if (!latest) return null;
        return {
          number: latest.number,
          decision:
            latest.decision === "changes_requested"
              ? ("changes_requested" as const)
              : null,
        };
      }),
  };
}

async function masterFacts(project: Project, personId: string | null) {
  const access = await requireApproved();
  const supabase = await createClient();
  const [launched, mixView, mixVersions, masteringVersions, sent, final] =
    await Promise.all([
      isWorkflowLaunched(project.id, "master"),
      loadStepView(project, access, "mix"),
      loadMixVersions(project, personId, "mix"),
      loadMixVersions(project, personId, "mastering"),
      supabase
        .from("master_transmissions")
        .select("acknowledged_at")
        .eq("project_id", project.id)
        .eq("role", "mastering")
        .is("revoked_at", null),
      loadFinalView(project, access),
    ]);
  // The workflow's titles: those still without a master final, and those
  // that got theirs through it (an approved mastering version). A title
  // already at its master final before is left out, as the package does.
  const open = new Set([
    ...mixView.titles.map((title) => title.id),
    ...masteringVersions.titles
      .filter((title) => title.finalNumber !== null)
      .map((title) => title.masterId),
  ]);
  const nothingToMix = mixView.titles.length === 0;
  const mixSent = mixView.history.some((row) => !row.revokedAt);
  const facts: MasterFacts = {
    launched,
    titles: project.masters.length,
    prepare: {
      sources: mixView.titles.filter((title) => title.source).length,
      sourcesTotal: mixView.titles.length,
      brief:
        nothingToMix || (mixView.brief !== null && mixView.engineer !== null),
      sent: nothingToMix || mixView.history.length > 0,
    },
    mix: {
      titles: open.size,
      sent: mixSent,
      acknowledged: mixView.history.some((row) => row.acknowledgedAt),
      ...openRound(mixVersions, open),
    },
    mastering: {
      titles: open.size,
      sent: (sent.data ?? []).length > 0,
      acknowledged: (sent.data ?? []).some((row) => row.acknowledged_at),
      ...openRound(masteringVersions, open),
    },
    deliverables: {
      expected: final.titles
        .filter((title) => open.has(title.id))
        .reduce((n, title) => n + title.deliverables.length, 0),
      received: final.titles
        .filter((title) => open.has(title.id))
        .reduce(
          (n, title) => n + title.deliverables.filter((d) => d.received).length,
          0,
        ),
    },
    validator: mixVersions.decider,
    mixEngineer: mixView.engineer?.name ?? null,
    masteringEngineer: final.engineer,
  };
  return {
    state: masterState(facts),
    allFinal: mastersFinal(facts),
    // The Mix V1 is met once a title has a mix version: no longer a
    // deadline to show.
    dates: mixView.brief?.dates
      ? {
          ...mixView.brief.dates,
          ...(mixVersions.titles.some((title) => title.versions.length > 0)
            ? { mixV1Due: null }
            : {}),
        }
      : null,
    engineers: {
      mix: mixView.engineer?.name ?? null,
      mastering: final.engineer,
    },
  };
}

async function legalFacts(project: Project) {
  const access = await requireApproved();
  const supabase = await createClient();
  const [launched, intake, intakeRow, tracking] = await Promise.all([
    isWorkflowLaunched(project.id, "legal"),
    loadIntake(project),
    supabase
      .from("legal_intakes")
      .select("status")
      .eq("project_id", project.id)
      .maybeSingle(),
    loadTracking(project, access),
  ]);
  const items = tracking.state === "tracking" ? tracking.items : [];
  const openQuestions = intake.questions.filter((q) => !q.answered).length;
  const confirmed = intakeRow.data?.status === "confirmed";
  const planLaunched = tracking.state === "tracking";
  const done: LegalStepKey[] = [
    ...(openQuestions === 0 ? (["framing"] as const) : []),
    ...(confirmed ? (["confirmation"] as const) : []),
    ...(planLaunched ? (["plan"] as const) : []),
  ];
  return {
    done,
    items,
    state: legalState({
      launched,
      openQuestions,
      answeredQuestions: intake.questions.length - openQuestions,
      confirmed,
      planLaunched,
      counts: summarizeTracking(items).counts,
      actionsDone: items.filter(
        (item) => item.current === "done" || item.current === "obsolete",
      ).length,
      actionsTotal: items.length,
    }),
  };
}

async function distributionFacts(projectId: string) {
  const supabase = await createClient();
  const [release, versions, declarations, platforms, closures, launchedAt] =
    await Promise.all([
      supabase
        .from("releases")
        .select("isrc, planned_release_date")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("distribution_versions")
        .select("number, status")
        .eq("project_id", projectId)
        .is("superseded_at", null)
        .order("number", { ascending: false })
        .limit(1),
      supabase
        .from("distribution_declarations")
        .select("version_number, kind, declared_at")
        .eq("project_id", projectId)
        .is("withdrawn_at", null)
        .order("declared_at", { ascending: false }),
      supabase
        .from("distribution_platforms")
        .select("platform")
        .eq("project_id", projectId)
        .eq("verification", "verified")
        .in("platform", [...REFERENCE_PLATFORMS]),
      supabase
        .from("distribution_closures")
        .select("kind, status, reserves, proposed_at, decided_at, reopened_at")
        .eq("project_id", projectId)
        .is("reopened_at", null)
        .in("status", ["pending", "closed"])
        .limit(1)
        .maybeSingle(),
      planLaunchedAt(projectId),
    ]);
  const open = closures.data;
  if (release.error) console.error("distributionFacts:", release.error.message);
  const latest = versions.data?.[0] ?? null;
  const status = latest?.status;
  const version: DistributionFacts["version"] =
    latest &&
    (status === "pending" || status === "approved" || status === "rejected")
      ? { number: latest.number, status }
      : null;
  // Only the current cycle's declarations, each kind read on its own.
  const own = (declarations.data ?? []).filter(
    (d) =>
      version?.status === "approved" && d.version_number === version.number,
  );
  const deposit = own.find((d) => d.kind === "deposit");
  const outcome = own.find(
    (d) => d.kind === "corrections_requested" || d.kind === "accepted",
  );
  const data = release.data;
  // Like the other workflows, the Distribution starts when the plan is
  // launched (proto « Projet complet »); one begun before (a release
  // recorded) keeps going.
  if (!launchedAt && data === null)
    return {
      state: {
        workflow: "distribution" as const,
        status: "not_started" as const,
        step: "prepare",
        reason: fr.workflowStatus.notLaunched,
        progress: fr.workflowStatus.distribution.progress(0),
        done: [],
      },
      plannedDate: null,
    };
  const state = distributionState(
    {
      recorded: data !== null,
      isrc: Boolean(data?.isrc),
      plannedDate: data?.planned_release_date ?? null,
      version,
      deposit: deposit ? { declaredAt: deposit.declared_at } : null,
      outcome:
        outcome?.kind === "corrections_requested" ||
        outcome?.kind === "accepted"
          ? outcome.kind
          : null,
      delivered: own.some((d) => d.kind === "platforms_delivered"),
      platforms: {
        verified: platforms.data?.length ?? 0,
        reference: REFERENCE_PLATFORMS.length,
      },
      closure:
        open && (open.status === "pending" || open.status === "closed")
          ? {
              status: open.status,
              kind: open.kind === "normal" ? "normal" : "reserves",
              on: open.decided_at ?? open.proposed_at,
              reserves: Array.isArray(open.reserves) ? open.reserves.length : 0,
            }
          : null,
    },
    formatDate,
  );
  return { state, plannedDate: data?.planned_release_date ?? null };
}

/**
 * The state of each workflow of a launched project, read from the existing
 * tables with the viewer's session at each request (nothing stored: ticket
 * « Architecture globale » § 2, « elle ne maintient pas une copie
 * indépendante des statuts »). Cached per request, so the project's layout
 * (sidebar, chevrons) and its overview share one reading.
 */
export const loadWorkflowStates = cache(
  async (projectId: string): Promise<WorkflowStates | null> => {
    const [access, project] = await Promise.all([
      requireApproved(),
      getProject(projectId),
    ]);
    if (!project || project.stages.length === 0) return null;
    const workflows = applicableWorkflows({
      type: project.type,
      masterCount: project.masters.length,
    });
    const has = (workflow: WorkflowKey) => workflows.includes(workflow);
    const legalAllowed = can(access, "manage_legal");

    const supabase = await createClient();
    const [
      master,
      legal,
      strategyLaunched,
      distribution,
      constraints,
      marketingStanding,
      designDone,
    ] = await Promise.all([
      has("master") ? masterFacts(project, access.personId) : null,
      has("legal") && legalAllowed ? legalFacts(project) : null,
      has("marketing") ? isWorkflowLaunched(project.id, "strategy") : false,
      has("distribution") ? distributionFacts(project.id) : null,
      supabase
        .from("framing_constraints")
        .select("id, text")
        .eq("project_id", project.id)
        .eq("type", "rights")
        .eq("review_status", "confirmed"),
      has("marketing") ? loadMarketingStanding(project.id) : null,
      // The Conception is done when every sheet is transferred (its stage
      // is never validated as a whole, docs/ARCHITECTURE.md § 8 decies).
      has("marketing")
        ? supabase
            .rpc("design_is_done", { p_project_id: project.id })
            .then((r) => r.data === true)
        : false,
    ]);

    let states: WorkflowStates["states"] = {};
    if (master) states.master = master.state;
    if (has("legal")) states.legal = legal ? legal.state : "restricted";
    if (has("marketing"))
      states.marketing = marketingState({
        launched: strategyLaunched,
        stages: project.stages.map((stage) =>
          stage.key === "design" && designDone
            ? { ...stage, state: "validated" }
            : stage,
        ),
        closure: marketingStanding?.status ?? "not_started",
      });
    if (distribution) states.distribution = distribution.state;

    const deps = dependencies({
      projectId: project.id,
      workflows,
      states,
      owner: project.ownerName,
      masterDue: master?.dates?.masterFinalDue ?? null,
      mastersFinal: master?.allFinal ?? null,
      engineers: master?.engineers ?? null,
      clearances: legal
        ? legal.items
            .filter((item) => item.kind === "clearance")
            .map((item) => ({
              title: item.subject
                ? `${item.label} · ${item.subject}`
                : item.label,
              open: item.current !== "done" && item.current !== "obsolete",
              due: item.dueOn,
              href: item.sourceHref ?? legalActionHref(project.id, item.kind),
            }))
        : null,
    });
    states = withDependencies(states, deps);
    return {
      workflows,
      states,
      legalDone: legal?.done ?? [],
      dependencies: deps,
      details: {
        masterDates: master?.dates ?? null,
        releaseDate: distribution?.plannedDate ?? null,
        legalItems: legal?.items ?? [],
        rightsConstraints: constraints.data ?? [],
      },
    };
  },
);
