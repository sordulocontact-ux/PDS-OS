import "server-only";

import { loadActivationsBoard } from "@/lib/activations/board";
import { isGated, phaseOf } from "@/lib/activations/phase";
import { loadLeverRows, loadLevers } from "@/lib/activations/levers";
import {
  loadActivationPeople,
  type ActivationPeople,
} from "@/lib/activations/people";
import type { ActivationSummary } from "@/lib/activations/types";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { JourneyStatus, JourneyStep } from "@/lib/ui/journey";

import type { ModuleJourney } from "./types";

const t = fr.activationJourney;

const href = (projectId: string, id: string, anchor: string | null) =>
  `${routes.projectActivation(projectId, id)}${anchor && anchor !== "now" ? `#${anchor}` : ""}`;

function statusOf(a: ActivationSummary): JourneyStatus {
  const phase = phaseOf(a);
  if (phase === 5) return "done";
  if (phase === -1) return "obsolete";
  if (isGated(a)) return "blocked";
  const first = a.actions[0];
  if (!first) return "upcoming";
  // Someone else's answer, through a link or a decision, holds it.
  return !first.who.viewer && (first.who.viaLink || first.kind === "validate")
    ? "waiting"
    : "current";
}

/** One activation as a step: its first action (the viewer's first). */
function stepsOf(
  projectId: string,
  a: ActivationSummary,
  people: ActivationPeople,
): JourneyStep[] {
  const owner = a.ownerPersonId ? people.person(a.ownerPersonId).name : null;
  const base: Omit<JourneyStep, "key" | "href" | "actor"> = {
    title: a.title,
    why: t.why[a.kind],
    status: statusOf(a),
    owner: owner ? { name: owner, role: t.owner } : null,
    validator: null,
    prereq: [],
    next: [],
    summary: a.lastFigure,
    due: a.dueOn,
  };
  const actor = (x: ActivationSummary["actions"][number]) => ({
    name: x.who.name,
    viewer: x.who.viewer,
    viaLink: x.who.viaLink,
    todo: x.todo,
    kind: x.kind,
  });
  const [first, ...rest] = a.actions;
  // The viewer's other lines on the same activation stay theirs to do
  // (Travail, Validations), each its own step.
  return [
    {
      ...base,
      key: a.id,
      href: href(projectId, a.id, first?.anchor ?? null),
      actor: first ? actor(first) : null,
    },
    ...rest
      .filter((x) => x.who.viewer)
      .map((x) => ({
        ...base,
        status: "current" as const,
        key: `${a.id}:${x.key}`,
        href: href(projectId, a.id, x.anchor),
        actor: actor(x),
      })),
  ];
}

/**
 * The Activations' journey for loadProjectJourneys (docs/ARCHITECTURE.md
 * § 3 ter, § 8 duodecies): « Leviers à préparer » once the Brief de sortie
 * is validated, then one step per activation with who acts on it now — the
 * owner, the direction on its decisions (`kind: "validate"`), a creator on
 * her private link. Nothing before the Stratégie gives a lever or an
 * activation exists.
 */
export async function activationsJourneys(
  projectId: string,
): Promise<ModuleJourney[]> {
  // The people and the levers' rows do not depend on the board: read in
  // the same round trip (page loads audit, docs/ARCHITECTURE.md § 3 bis).
  const peopleRead = loadActivationPeople(projectId);
  const leverRowsRead = loadLeverRows(projectId);
  // Awaited below unless the board fails: never an unhandled rejection.
  peopleRead.catch(() => {});
  leverRowsRead.catch(() => {});
  let board: Awaited<ReturnType<typeof loadActivationsBoard>>;
  try {
    board = await loadActivationsBoard(projectId);
  } catch (error) {
    // A failed read leaves this journey out, never the project's page.
    console.error("activationsJourneys:", error);
    return [];
  }
  const [people, levers] = await Promise.all([
    peopleRead,
    loadLevers(projectId, board.data.activations),
  ]);
  const steps: JourneyStep[] = [];
  if (levers.items.length > 0) {
    const proposed = levers.items.filter((l) => l.state === "proposed").length;
    const created = levers.items.filter((l) => l.state === "created").length;
    steps.push({
      key: "levers",
      href: `${routes.projectActivations(projectId)}#levers`,
      title: t.levers.step,
      why: t.levers.why,
      status: proposed > 0 ? "current" : "done",
      owner: { name: people.projectOwner.name, role: t.owner },
      validator: null,
      prereq: [],
      next: [],
      actor:
        proposed > 0
          ? {
              name: people.projectOwner.name,
              viewer: people.projectOwner.viewer,
              viaLink: false,
              todo: t.levers.todo(proposed),
              kind: "do",
            }
          : null,
      summary: proposed > 0 ? null : t.levers.done(created),
    });
  }
  for (const a of board.summaries) steps.push(...stepsOf(projectId, a, people));
  if (steps.length === 0) return [];
  return [
    {
      module: "marketing",
      label: fr.shell.project.sidebar.marketing,
      part: {
        key: "activations",
        label: fr.shell.project.marketingSteps.activations,
      },
      steps,
    },
  ];
}
