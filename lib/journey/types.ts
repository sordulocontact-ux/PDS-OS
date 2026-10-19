// Shapes of the project's journeys (lib/journey/project.ts), client-safe so
// NowCard and the transverse pages can read them.

import type { JourneyStep } from "@/lib/ui/journey";

/** The project's workflows, in the order « mine » lists them (shell.md
 * lot 2): the Cadrage first, then the Marketing, Master, Juridique,
 * Distribution. */
export const JOURNEY_MODULES = [
  "framing",
  "marketing",
  "master",
  "legal",
  "distribution",
] as const;
export type JourneyModuleKey = (typeof JOURNEY_MODULES)[number];

/** One journey of the project: a workflow, or a part of it (a Marketing
 * sub-module, one deliverable's Production). */
export type ModuleJourney = {
  module: JourneyModuleKey;
  // « Marketing »
  label: string;
  // « Production › Pochette », « Conception »: what follows the module's
  // name in « Module › … › Étape ».
  part?: { key: string; label: string };
  steps: JourneyStep[];
};

/** An open step of a journey with someone to act on it, and where it is. */
export type ProjectAction = {
  module: JourneyModuleKey;
  // « Marketing › Production › Pochette »
  place: string;
  // The journey's part key (« strategy », « production:<id> »), if any.
  part?: string;
  step: JourneyStep;
};

export type ProjectJourneys = {
  journeys: ModuleJourney[];
  // The viewer's actions, Cadrage first (JOURNEY_MODULES order).
  mine: ProjectAction[];
  // What others are expected to do.
  waiting: ProjectAction[];
  // The viewer's actions that are decisions (actor.kind « validate »): the
  // project's Validations (never filtered by the verb of the label).
  validations: ProjectAction[];
};

export const placeOf = (journey: ModuleJourney) =>
  journey.part ? `${journey.label} › ${journey.part.label}` : journey.label;
