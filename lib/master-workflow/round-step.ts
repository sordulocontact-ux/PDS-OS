import "server-only";

import { emailEnabled } from "@/lib/email/send";
import { isBudgetStatus, type BudgetStatus } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
import { liveTransmission } from "@/lib/master-workflow/journey";
import {
  loadDirectionPerson,
  masterJourneyContext,
} from "@/lib/master-workflow/journey-context";
import { can } from "@/lib/auth/access";
import type { JourneyTransmission } from "@/lib/master-workflow/journey-facts";
import { loadMixVersions } from "@/lib/master-workflow/mix-versions";
import type { MixVersionsView } from "@/lib/master-workflow/mix-types";
import { vocalsAwaited } from "@/lib/master-workflow/source-rules";
import {
  loadStepView,
  type StepView,
} from "@/lib/master-workflow/transmission";
import { canSeeProjectBudget } from "@/lib/projects/edit-access";
import { createClient } from "@/lib/supabase/server";
import type { Blocker } from "@/lib/ui/journey";
import { masterStepHref } from "@/lib/ui/master-steps";

type Stage = "mix" | "mastering";

export type RoundVersionExtra = {
  // The source a mix version was made on, and whether it was a working one.
  source: string | null;
  working: boolean;
  // The title's current source has its final vocals (a working mix then
  // only needs a new version).
  finalVocals: boolean;
  reopenedAt: string | null;
  reopenReason: string | null;
  // Deposited by the engineer through the link (no member as author).
  viaLink: boolean;
  approvedNote: string | null;
};

export type RoundRate = {
  stage: Stage;
  amountCents: number;
  status: BudgetStatus;
  note: string | null;
  updatedAt: string;
  // The estimate of the Brief, to say « c'est le tarif estimé ».
  estimateCents: number | null;
};

export type RoundStepView = {
  stage: Stage;
  // PDS OS sends the e-mail itself (EMAIL_SMTP_*, lib/email/send.ts);
  // otherwise the sending is declared (« Marquer comme envoyé »).
  emailEnabled: boolean;
  view: StepView;
  versions: MixVersionsView;
  extras: Record<string, RoundVersionExtra>;
  link:
    (JourneyTransmission & { path: string | null; daysLeft: number }) | null;
  rates: RoundRate[];
  // The Brief is recorded, unchanged since; or why not.
  brief: "ready" | "dirty" | "never";
  briefChangedSinceSent: boolean;
  // What prevents the package from leaving, worded, with the step where it
  // is lifted: the final vocals awaited (« Attendre »), then the view's own.
  // Read by the page and by PO (step_status), so both say the same thing.
  blockers: Blocker[];
  // The mix existed and was declared Mix final (« Non nécessaire »).
  notNeeded: Array<{
    title: string;
    file: string;
    by: string | null;
    at: string;
  }>;
  // The validated Mix finals: the Mastering's prerequisite.
  mixReady: boolean;
  validator: string | null;
  owner: string | null;
  canSeeBudget: boolean;
  // The direction decides a delay sent to it (proto `master:thread`).
  isDirection: boolean;
  direction: string | null;
  // The in-house engineer of the round (a member: no link, no invoice).
  inHouse: {
    personId: string;
    name: string;
    assignedAt: string | null;
    isViewer: boolean;
  } | null;
};

/**
 * The Mixage or the Mastering step (proto `master-v2.html`): what the
 * package holds and what still blocks it, the live private link (readable
 * again by the owner), the rate proposed, every version with its feedback
 * and its decision. One round of queries with the viewer's session.
 */
export async function loadRoundStep(
  projectId: string,
  stage: Stage,
): Promise<RoundStepView> {
  const { access, project, facts } = await masterJourneyContext(projectId);
  const supabase = await createClient();
  const live = liveTransmission(facts, stage);
  const [view, versions, budget, token, direction] = await Promise.all([
    loadStepView(project, access, stage),
    loadMixVersions(project, access.personId, stage),
    supabase
      .from("budget_lines")
      .select("master_role, amount_cents, status, note, updated_at")
      .eq("project_id", projectId)
      .not("master_role", "is", null),
    live
      ? supabase.rpc("master_transmission_link", {
          p_transmission_id: live.id,
        })
      : Promise.resolve({ data: null }),
    loadDirectionPerson(),
  ]);

  const extras: Record<string, RoundVersionExtra> = {};
  for (const v of facts.versions.filter((x) => x.stage === stage)) {
    const title = facts.titles.find((x) => x.id === v.masterId);
    const sourceRow = title?.sources.find((s) => s.fileId === v.sourceFileId);
    extras[v.id] = {
      source:
        title?.audio.find((a) => a.id === v.sourceFileId)?.fileName ??
        sourceRow?.fileName ??
        null,
      working: sourceRow?.vocalsFinal === false,
      finalVocals: title?.sources[0]?.vocalsFinal === true,
      reopenedAt: v.reopenedAt,
      reopenReason: v.reopenReason,
      viaLink: v.createdBy === null,
      approvedNote: null,
    };
  }

  const brief = facts.brief;
  const estimate = (s: Stage) =>
    s === "mix" ? view.brief?.mixRateCents : view.brief?.masteringRateCents;
  const roles: Stage[] =
    stage === "mix" && brief?.masteringSame ? ["mix", "mastering"] : [stage];
  const rates: RoundRate[] = (budget.data ?? []).flatMap((row) =>
    (row.master_role === "mix" || row.master_role === "mastering") &&
    roles.includes(row.master_role) &&
    isBudgetStatus(row.status)
      ? [
          {
            stage: row.master_role,
            amountCents: row.amount_cents,
            status: row.status,
            note: row.note,
            updatedAt: row.updated_at,
            estimateCents: estimate(row.master_role) ?? null,
          },
        ]
      : [],
  );

  const mixVersions = facts.versions.filter((v) => v.stage === "mix");
  const inRound = facts.titles.filter(
    (t) => mixVersions.some((v) => v.masterId === t.id) || t.sources.length,
  );
  // An in-house engineer: nobody to choose in the Réseau.
  const inHousePerson =
    stage === "mix" || brief?.masteringSame
      ? brief?.mixPerson
      : brief?.masteringPerson;
  const noContact = [
    fr.masterWorkflow.mix.blockers.engineer,
    fr.masterWorkflow.mix.blockers.masteringEngineer,
  ] as string[];
  const shown = inHousePerson
    ? {
        ...view,
        blockers: view.blockers.filter((b) => !noContact.includes(b.text)),
      }
    : view;
  const awaited =
    stage === "mix" &&
    facts.titles.some(
      (t) =>
        vocalsAwaited(t.sources[0] ?? null) && t.sources[0]?.plan === "wait",
    );
  return {
    stage,
    emailEnabled: emailEnabled(),
    view: shown,
    blockers: [
      ...(awaited
        ? [
            {
              text: fr.masterRound.blockers.vocals,
              href: masterStepHref(projectId, "source"),
            },
          ]
        : []),
      ...shown.blockers,
    ],
    versions,
    extras,
    link: live
      ? {
          ...live,
          path: token.data ? `/m/${token.data}` : null,
          daysLeft: Math.floor(
            (Date.parse(live.expiresAt) - Date.now()) / 86_400_000,
          ),
        }
      : null,
    rates,
    brief: !brief?.recordedAt ? "never" : brief.dirty ? "dirty" : "ready",
    briefChangedSinceSent: Boolean(
      live && brief && brief.contentChangedAt > live.createdAt,
    ),
    notNeeded: mixVersions.flatMap((v) =>
      v.declared
        ? [
            {
              title: facts.titles.find((t) => t.id === v.masterId)?.title ?? "",
              file: v.fileName,
              by: v.decidedBy,
              at: v.createdAt,
            },
          ]
        : [],
    ),
    mixReady:
      inRound.length > 0 &&
      inRound.every((t) =>
        mixVersions.some(
          (v) => v.masterId === t.id && v.decision === "approved",
        ),
      ),
    validator: brief?.validatorName ?? project.ownerName,
    owner: project.ownerName,
    canSeeBudget: canSeeProjectBudget(access, project),
    isDirection: can(access, "validate"),
    direction: direction?.name ?? null,
    inHouse: (() => {
      const same = stage === "mix" || brief?.masteringSame;
      const person = same ? brief?.mixPerson : brief?.masteringPerson;
      return person
        ? {
            ...person,
            assignedAt:
              (stage === "mix"
                ? brief?.mixAssignedAt
                : brief?.masteringAssignedAt) ?? null,
            isViewer: person.personId === access.personId,
          }
        : null;
    })(),
  };
}

/** The label of a round's versions (« Mix », « Master »). */
export const roundLabel = (stage: Stage) =>
  fr.masterJourney.versionLabel[stage];
