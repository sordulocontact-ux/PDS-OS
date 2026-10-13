// What every next-action rule shares: links into the sheet's tabs and the
// rule that an action for someone else reads as a wait with who and why
// (PROD-001). Client-safe.

import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { ScheduleStep } from "@/lib/production/preprod/schedule";

import type {
  NextInput,
  NextLink,
  NextPerson,
  NextRole,
  ProductionNext,
} from "./types";

export type Place = keyof typeof fr.productionNext.places;
// A step names the schedule date it is due by, if any.
export type Step = Omit<ProductionNext, "who" | "viewerIsWho" | "due"> & {
  dueKey?: ScheduleStep;
};

export type NextContext = {
  input: NextInput;
  link: (label: string, step: string, anchor: string, place: Place) => NextLink;
  by: (
    person: NextPerson | null,
    role: NextRole,
    viewerIsWho: boolean,
    step: Step,
  ) => ProductionNext;
  owner: (step: Step) => ProductionNext;
};

/** An empty step: nothing missing, nothing just finished. */
export const blank = { missing: [] as string[], done: null as string | null };

/** The fields of a step nobody in particular is expected for. */
export const nobody = { ...blank, who: null, viewerIsWho: false, due: null };

export function nextContext(input: NextInput): NextContext {
  const places = fr.productionNext.places;
  const href = (step: string, anchor: string) =>
    `${
      step
        ? routes.projectProductionStep(
            input.projectId,
            input.deliverableId,
            step,
          )
        : routes.projectProductionSheet(input.projectId, input.deliverableId)
    }#${anchor}`;
  const by: NextContext["by"] = (
    person,
    role,
    viewerIsWho,
    { dueKey, ...step },
  ) => ({
    ...step,
    kind: viewerIsWho || step.kind === "done" ? step.kind : "wait",
    who: { name: person?.name ?? null, role },
    viewerIsWho,
    due: dueKey ? (input.due[dueKey] ?? null) : null,
  });
  return {
    input,
    link: (label, step, anchor, place) => ({
      label,
      href: href(step, anchor),
      place: places[place],
    }),
    by,
    owner: (step) => by(input.owner, "owner", input.owner.isViewer, step),
  };
}
