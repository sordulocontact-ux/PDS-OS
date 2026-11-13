import "server-only";

import { masterJourneyContext } from "@/lib/master-workflow/journey-context";
import {
  titleMasterLabel,
  titleMasterState,
} from "@/lib/projects/title-board-rules";
import { masterNameOf, projectTitleLabel } from "@/lib/projects/title-rules";
import { loadProjectTitles } from "@/lib/projects/titles";
import { createClient } from "@/lib/supabase/server";
import type { MasterStepKey } from "@/lib/ui/master-steps";
import type { CrumbOption } from "@/lib/ui/module-frame";
import { masterStepHref } from "@/lib/ui/master-steps";
import { trackedCache } from "@/lib/projects/live-deps";

/** A title of a collective's Master, as its switcher lists it. */
export type MasterTitleChoice = {
  masterId: string;
  // Its name in the project (« Titre 2 · sans nom », never a provisional
  // name of the Catalogue, lot 7).
  label: string;
  abandoned: boolean;
  // Where it stands in the Master (« Mix V2 à valider »); null: nothing yet.
  state: string | null;
  done: boolean;
  // A version of it waits for a decision.
  pending: boolean;
};

/** The titles of a collective's Master and the one the page shows. */
export type MasterTitleScope = {
  choices: MasterTitleChoice[];
  active: MasterTitleChoice;
};

/**
 * Projet collectif, lot 8: the Master of a collective is worked one title
 * at a time (principle 1). The titles that have a master, in the project's
 * order (abandoned last, still reachable: their history is kept), and the
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
      if (!title.master) return [];
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
      return [
        {
          masterId: title.master.id,
          label: projectTitleLabel({
            position: title.position,
            workingTitle: title.workingTitle,
            masterTitle: masterNameOf(title.master),
          }),
          abandoned: title.status === "abandoned",
          state: titleMasterLabel(state),
          done: state.kind === "final",
          pending: state.kind === "round" && state.decision === "pending",
        },
      ];
    });
    if (choices.length === 0) return null;
    const live = choices.filter((choice) => !choice.abandoned);
    const round = step === "mix" || step === "mastering";
    const active =
      choices.find((choice) => choice.masterId === titre) ??
      (round ? live.find((choice) => choice.pending) : undefined) ??
      live[0] ??
      choices[0];
    return { choices, active };
  },
);

/** The trail's segment of the active title (Master ▸ titre ▸ étape): its
 * siblings to switch to, on the same step; none when there is one title. */
export function titleCrumb(
  projectId: string,
  step: MasterStepKey,
  scope: MasterTitleScope,
  labels: { abandoned: string },
): { label: string; options?: CrumbOption[] } {
  if (scope.choices.length < 2) return { label: scope.active.label };
  const href = masterStepHref(projectId, step);
  return {
    label: scope.active.label,
    options: scope.choices.map((choice) => ({
      key: choice.masterId,
      label: choice.label,
      href: `${href}?titre=${choice.masterId}`,
      detail: choice.abandoned ? labels.abandoned : (choice.state ?? undefined),
      current: choice.masterId === scope.active.masterId,
      done: choice.done,
    })),
  };
}
