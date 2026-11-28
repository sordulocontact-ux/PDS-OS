import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";

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
import { countedTitlesProject } from "@/lib/projects/counted-titles";
import { loadProjectTitles } from "@/lib/projects/titles";
import { byProjectVersion } from "@/lib/projects/version-cache";
import { REFERENCE_PLATFORMS } from "@/lib/distribution/platforms";
import { releaseArg } from "@/lib/distribution/scope";
import { formatDate } from "@/lib/release/format";
import {
  distributionCover,
  distributionLegalBlockers,
} from "@/lib/distribution/shared-reads";
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
  const [
    launched,
    mixView,
    mixVersions,
    masteringVersions,
    sent,
    final,
    titles,
  ] = await Promise.all([
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
    // A collective's titles without any audio are not in its masters.
    project.collective ? loadProjectTitles(project.id) : Promise.resolve([]),
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
    withoutAudio: titles.filter(
      (title) => title.status !== "abandoned" && !title.master,
    ).length,
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

// The Distribution's raw rows, in one call (distribution_status_rows: the
// filters live there, the state is still decided by distributionState).
type DistributionRows = {
  release: { isrc: string | null; planned_release_date: string | null } | null;
  version: { number: number; status: string } | null;
  declarations: Array<{
    version_number: number;
    kind: string;
    declared_at: string;
  }>;
  verified_platforms: number;
  closure: {
    kind: string;
    status: string;
    reserves: unknown;
    open_reserves?: number;
    proposed_at: string;
    decided_at: string | null;
  } | null;
  params_confirmed_at: string | null;
};

// A collective's Distribution is held release by release (lot 15): its
// state is the least advanced of its live releases' (archived ones and
// abandoned titles' left out). In a mode with singles, a live title without
// its release yet (no audio) keeps it from being done.
async function distributionFacts(projectId: string) {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("collective, collective_release_mode")
    .eq("id", projectId)
    .maybeSingle();
  if (!project?.collective) return distributionFactsOf(projectId, null);
  const [{ data: releases }, { data: titles }] = await Promise.all([
    supabase
      .from("releases")
      .select("id, project_title_id, project_titles(status)")
      .eq("project_id", projectId)
      .is("archived_at", null),
    supabase
      .from("project_titles")
      .select("id")
      .eq("project_id", projectId)
      .neq("status", "abandoned"),
  ]);
  const live = (releases ?? []).filter(
    (r) => r.project_titles?.status !== "abandoned",
  );
  const singles = project.collective_release_mode !== "compilation";
  const released = new Set(live.map((r) => r.project_title_id));
  const unreleased = singles
    ? (titles ?? []).filter((t) => !released.has(t.id)).length
    : 0;
  if (live.length === 0) return distributionFactsOf(projectId, null);
  const all = await Promise.all(
    live.map((r) => distributionFactsOf(projectId, r.id)),
  );
  const least = all.reduce((least, facts) =>
    facts.state.done.length < least.state.done.length ? facts : least,
  );
  if (unreleased === 0 || least.state.status !== "done") return least;
  return {
    ...least,
    state: {
      ...least.state,
      status: "in_progress" as const,
      reason: fr.workflowStatus.distribution.withoutRelease(unreleased),
      done: least.state.done.filter((step) => step !== "closure"),
    },
  };
}

async function distributionFactsOf(
  projectId: string,
  releaseId: string | null,
) {
  const supabase = await createClient();
  const [rows, launchedAt, cover, blockers] = await Promise.all([
    supabase
      .rpc("distribution_status_rows", {
        p_project_id: projectId,
        p_reference_platforms: [...REFERENCE_PLATFORMS],
        ...releaseArg(releaseId),
      })
      .then(({ data, error }) => {
        if (error) console.error("distributionFacts:", error.message);
        return (data as DistributionRows | null) ?? null;
      }),
    // The Distribution starts with the plan (lib/distribution/journey-context.ts).
    planLaunchedAt(projectId),
    distributionCover(projectId, releaseId),
    distributionLegalBlockers(projectId),
  ]);
  const open = rows?.closure ?? null;
  const latest = rows?.version ?? null;
  const status = latest?.status;
  const version: DistributionFacts["version"] =
    latest &&
    (status === "pending" || status === "approved" || status === "rejected")
      ? { number: latest.number, status }
      : null;
  // Only the current cycle's declarations, each kind read on its own.
  const own = (rows?.declarations ?? []).filter(
    (d) =>
      version?.status === "approved" && d.version_number === version.number,
  );
  const deposit = own.find((d) => d.kind === "deposit");
  const outcome = own.find(
    (d) => d.kind === "corrections_requested" || d.kind === "accepted",
  );
  const data = rows?.release ?? null;
  // Like the other workflows, the Distribution starts when the plan is
  // launched (proto « Projet complet »); one begun before (a release
  // recorded) keeps going.
  if (!launchedAt && data === null)
    return {
      state: {
        workflow: "distribution" as const,
        status: "not_started" as const,
        step: "prep",
        reason: fr.workflowStatus.notLaunched,
        progress: fr.workflowStatus.distribution.progress(0),
        done: [],
      },
      plannedDate: null,
      cover: null,
      legalBlockers: null,
    };
  const state = distributionState(
    {
      launched: Boolean(launchedAt),
      paramsConfirmed: Boolean(rows?.params_confirmed_at),
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
        verified: rows?.verified_platforms ?? 0,
        reference: REFERENCE_PLATFORMS.length,
      },
      closure:
        open && (open.status === "pending" || open.status === "closed")
          ? {
              status: open.status,
              kind: open.kind === "normal" ? "normal" : "reserves",
              on: open.decided_at ?? open.proposed_at,
              reserves: Array.isArray(open.reserves) ? open.reserves.length : 0,
              openReserves: open.open_reserves ?? 0,
            }
          : null,
    },
    formatDate,
  );
  const found = cover.data?.[0] ?? null;
  return {
    state,
    plannedDate: data?.planned_release_date ?? null,
    // What the deposit waits for from the Marketing and the Juridique,
    // readable by all (supabase/migrations/20261019100101).
    cover: found
      ? { title: found.title, delivered: found.delivered_at !== null }
      : null,
    legalBlockers: (blockers.data ?? []).map((b) => b.work),
  };
}

// Each workflow's facts kept on their own, with the tables they read
// (lib/projects/version-cache.ts): a write in the Cadrage no longer reads the
// Master, the Juridique and the Distribution again.
// A collective's abandoned titles leave the counts (lot 9).
const projectOf = async (projectId: string) => {
  const project = await getProject(projectId);
  return project ? countedTitlesProject(project) : null;
};
const keptMasterFacts = byProjectVersion("wf-master", async (projectId) => {
  const [access, project] = await Promise.all([
    requireApproved(),
    projectOf(projectId),
  ]);
  return project ? masterFacts(project, access.personId) : null;
});
// The Juridique keeps every title (abandoned ones too) until it is read by
// participation (lot 11).
const keptLegalFacts = byProjectVersion("wf-legal", async (projectId) => {
  const project = await getProject(projectId);
  return project ? legalFacts(project) : null;
});
const keptDistributionFacts = byProjectVersion(
  "wf-distribution",
  distributionFacts,
);
const keptMarketingStanding = byProjectVersion(
  "wf-marketing",
  loadMarketingStanding,
);

/**
 * The state of each workflow of a launched project, read from the existing
 * tables with the viewer's session at each request (nothing stored: ticket
 * « Architecture globale » § 2, « elle ne maintient pas une copie
 * indépendante des statuts »). Cached per request, so the project's layout
 * (sidebar, chevrons) and its overview share one reading.
 */
export const loadWorkflowStates = trackedCache(
  byProjectVersion(
    "workflow-states",
    async (projectId: string): Promise<WorkflowStates | null> => {
      const [access, read] = await Promise.all([
        requireApproved(),
        getProject(projectId),
      ]);
      if (!read || read.stages.length === 0) return null;
      const project = countedTitlesProject(read);
      const workflows = applicableWorkflows({
        type: project.type,
        masterCount: project.masters.length,
        collective: project.collective,
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
        has("master") ? keptMasterFacts(project.id) : null,
        has("legal") && legalAllowed ? keptLegalFacts(project.id) : null,
        has("marketing") ? isWorkflowLaunched(project.id, "strategy") : false,
        has("distribution") ? keptDistributionFacts(project.id) : null,
        supabase
          .from("framing_constraints")
          .select("id, text")
          .eq("project_id", project.id)
          .eq("type", "rights")
          .eq("review_status", "confirmed"),
        has("marketing") ? keptMarketingStanding(project.id) : null,
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
        cover: distribution?.cover ?? null,
        legalBlockers: distribution?.legalBlockers ?? null,
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
  ),
);
