import "server-only";

import { routes } from "@/lib/auth/redirects";
import { masterJourneyContext } from "@/lib/master-workflow/journey-context";
import type { JourneyFileRequest } from "@/lib/master-workflow/journey-facts";
import {
  titleMasterLabel,
  titleMasterState,
} from "@/lib/projects/title-board-rules";
import {
  masterNameOf,
  projectTitleLabel,
  titleGuestNames,
} from "@/lib/projects/title-rules";
import { loadProjectTitles } from "@/lib/projects/titles";
import { createClient } from "@/lib/supabase/server";
import type { MasterStepKey } from "@/lib/ui/master-steps";
import type { CrumbOption } from "@/lib/ui/module-frame";
import { masterStepHref } from "@/lib/ui/master-steps";
import { trackedCache } from "@/lib/projects/live-deps";

/** A title of a collective's Master, as its switcher lists it. */
export type MasterTitleChoice = {
  masterId: string;
  // Its title in the project (project_titles.id), stable.
  titleId: string;
  // Its name in the project (« Titre de Jay (à nommer) », never a provisional
  // name of the Catalogue, lot 7).
  label: string;
  // Where it stands in the Master (« Mix V2 à valider »); null: nothing yet.
  state: string | null;
  done: boolean;
  // A version of it waits for a decision.
  pending: boolean;
  // What it waits for, for the Master's overview (lot 9): its source, a
  // mix, a mastering (from the engineer), or a validation (of the round in
  // `round`); null when it has its Master final.
  waiting: { kind: MasterTitleWaiting; round: "mix" | "mastering" } | null;
  // Its files asked of a member of the team (lot 9 bis), while it waits for
  // its source: the open line.
  request: JourneyFileRequest | null;
};

export const MASTER_TITLE_WAITINGS = [
  "source",
  "mix",
  "mastering",
  "validation",
] as const;
export type MasterTitleWaiting = (typeof MASTER_TITLE_WAITINGS)[number];

/** The titles of a collective's Master and the one the page shows. */
export type MasterTitleScope = {
  choices: MasterTitleChoice[];
  active: MasterTitleChoice;
  // Its live titles still without any audio (no master yet, « Titre de Jay
  // (à nommer) »): out of the switcher, counted as waiting for their source.
  withoutAudio: Array<{ titleId: string; label: string }>;
};

/**
 * Projet collectif, lot 8: the Master of a collective is worked one title
 * at a time (principle 1). The titles that have a master, in the project's
 * order (an abandoned title is out of the Master, lot 9: its history is
 * kept, its reactivation brings it back), and the
 * active one: the URL's (`?titre=`), else the step's own default (the first
 * with a version waiting for a decision on a round, the first live one
 * otherwise; the Source keeps its own rule, pickSourceTitle). Null for any
 * other project: no switcher, nothing filtered.
 */
export const loadMasterTitleScope = trackedCache(
  async (
    projectId: string,
    step: MasterStepKey,
    titre: string | null,
  ): Promise<MasterTitleScope | null> => {
    const { project, facts } = await masterJourneyContext(projectId);
    if (!project.collective) return null;
    const supabase = await createClient();
    const [titles, audio] = await Promise.all([
      loadProjectTitles(projectId),
      supabase
        .from("project_masters")
        .select(
          "master:masters!project_masters_master_same_org(id, audio_state)",
        )
        .eq("project_id", projectId),
    ]);
    if (audio.error)
      console.error("loadMasterTitleScope:", audio.error.message);
    const finalInCatalogue = new Set(
      (audio.data ?? []).flatMap((row) =>
        row.master?.audio_state === "final_master" ? [row.master.id] : [],
      ),
    );
    const choices: MasterTitleChoice[] = titles.flatMap((title) => {
      if (!title.master || title.status === "abandoned") return [];
      const versions = facts.versions.flatMap((v) =>
        v.masterId === title.master!.id && v.decision !== "reopened"
          ? [{ stage: v.stage, number: v.number, decision: v.decision }]
          : [],
      );
      const state = titleMasterState({
        hasMaster: true,
        finalInCatalogue: finalInCatalogue.has(title.master.id),
        versions,
      });
      const sourced = facts.titles.some(
        (t) => t.id === title.master!.id && t.sources.length > 0,
      );
      const waiting = waitingOf(state, sourced);
      return [
        {
          masterId: title.master.id,
          titleId: title.id,
          label: projectTitleLabel({
            position: title.position,
            workingTitle: title.workingTitle,
            masterTitle: masterNameOf(title.master),
            artists: titleGuestNames(title.participations),
          }),
          state: titleMasterLabel(state),
          done: state.kind === "final",
          pending: state.kind === "round" && state.decision === "pending",
          waiting,
          request:
            waiting?.kind === "source"
              ? (facts.fileRequests.find(
                  (r) => r.masterId === title.master!.id,
                ) ?? null)
              : null,
        },
      ];
    });
    if (choices.length === 0) return null;
    const round = step === "mix" || step === "mastering";
    const active =
      choices.find((choice) => choice.masterId === titre) ??
      (round ? choices.find((choice) => choice.pending) : undefined) ??
      choices[0];
    const withoutAudio = titles.flatMap((title) =>
      title.master || title.status === "abandoned"
        ? []
        : [
            {
              titleId: title.id,
              label: projectTitleLabel({
                position: title.position,
                workingTitle: title.workingTitle,
                masterTitle: null,
                artists: titleGuestNames(title.participations),
              }),
            },
          ],
    );
    return { choices, active, withoutAudio };
  },
);

/** The trail's segment of the active title (Master ▸ titre ▸ étape): its
 * name opens the title's page (« Titres », Maël 25/11/2026), its siblings
 * to switch to on the same step; none when there is one title. */
export function titleCrumb(
  projectId: string,
  step: MasterStepKey,
  scope: MasterTitleScope,
): { label: string; href: string; options?: CrumbOption[] } {
  const crumb = {
    label: scope.active.label,
    href: routes.projectTrack(projectId, scope.active.titleId),
  };
  if (scope.choices.length < 2) return crumb;
  const href = masterStepHref(projectId, step);
  return {
    ...crumb,
    options: scope.choices.map((choice) => ({
      key: choice.masterId,
      label: choice.label,
      href: `${href}?titre=${choice.masterId}`,
      detail: choice.state ?? undefined,
      current: choice.masterId === scope.active.masterId,
      done: choice.done,
    })),
  };
}

/** What a title waits for in the Master, from its state and whether its
 * source is confirmed. */
function waitingOf(
  state: ReturnType<typeof titleMasterState>,
  sourced: boolean,
): MasterTitleChoice["waiting"] {
  switch (state.kind) {
    case "none":
    case "final":
      return null;
    case "todo":
      return sourced
        ? { kind: "mix", round: "mix" }
        : { kind: "source", round: "mix" };
    case "mixed":
      return { kind: "mastering", round: "mastering" };
    case "round":
      return state.decision === "pending"
        ? { kind: "validation", round: state.round }
        : { kind: state.round, round: state.round };
  }
}

/** The Master's overview of a collective (lot 9): how many titles wait for
 * a source, a mix, a mastering, a validation; each count opens the first
 * of them on its step. The abandoned titles are not counted. */
export function titleWaitings(projectId: string, scope: MasterTitleScope) {
  return MASTER_TITLE_WAITINGS.map((kind) => {
    const titles = scope.choices.filter((c) => c.waiting?.kind === kind);
    // A title without any audio waits for its source too; it has no step of
    // the Master to open yet, its page says where it stands.
    const silent = kind === "source" ? scope.withoutAudio : [];
    const first = titles[0];
    const step: MasterStepKey =
      kind === "source"
        ? "source"
        : kind === "validation"
          ? (first?.waiting?.round ?? "mix")
          : kind;
    return {
      kind,
      count: titles.length + silent.length,
      // Among them, the titles whose files are asked for (lot 9 bis).
      requested: titles.filter((c) => c.request).length,
      names: [...titles.map((c) => c.label), ...silent.map((s) => s.label)],
      href: first
        ? `${masterStepHref(projectId, step)}?titre=${first.masterId}`
        : silent[0]
          ? routes.projectTrack(projectId, silent[0].titleId)
          : null,
    };
  });
}
