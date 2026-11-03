import "server-only";

import { actionLine } from "@/lib/assistant/journey-facts";
import { pageRecord } from "@/lib/assistant/page-context";
import { uniqueSources, type Source } from "@/lib/assistant/sources";
import { assistant } from "@/lib/i18n/fr/assistant";
import { type ModuleJourney, placeOf } from "@/lib/journey/types";
import { loadRoundStep } from "@/lib/master-workflow/round-step";
import { loadShellJourneys } from "@/lib/overview/journeys";
import { getProject } from "@/lib/projects/queries";
import {
  actionHref,
  type JourneyStep,
  nextOf,
  OPEN_STATUSES,
  prereqsOf,
  withModule,
} from "@/lib/ui/journey";

const fr = { assistant };

type Found = { journey: ModuleJourney; step: JourneyStep };

const clean = (href: string) => href.split(/[?#]/)[0].replace(/\/$/, "");

/**
 * The steps the open page shows: the one whose page it is, else, on a
 * module's page (/master, /legal), its steps still to do.
 */
function stepsOfPage(journeys: ModuleJourney[], path: string): Found[] {
  const here = clean(path);
  const all = journeys.flatMap((journey) =>
    journey.steps.map((step) => ({ journey, step })),
  );
  const exact = all.filter(({ step }) => clean(step.href) === here);
  if (exact.length > 0) return exact;
  return all.filter(
    ({ step }) =>
      clean(step.href).startsWith(`${here}/`) &&
      step.status !== "done" &&
      step.status !== "obsolete",
  );
}

/** What stops the Mixage or the Mastering package, as the page shows it. */
async function roundFacts(
  projectId: string,
  journey: ModuleJourney,
  step: JourneyStep,
): Promise<{ facts: string[]; sources: Source[] }> {
  const t = fr.assistant.stepStatus;
  if (journey.module !== "master") return { facts: [], sources: [] };
  if (step.key !== "mix" && step.key !== "mastering")
    return { facts: [], sources: [] };
  if (!OPEN_STATUSES.includes(step.status)) return { facts: [], sources: [] };
  const round = await loadRoundStep(projectId, step.key);
  const to = t.rounds[step.key];
  if (round.blockers.length === 0)
    return { facts: [t.noBlocker(to)], sources: [] };
  const titleOf = (href: string) =>
    journey.steps.find((s) => clean(s.href) === clean(href))?.title;
  return {
    facts: round.blockers.map((b) => t.blocker(to, b.text)),
    sources: round.blockers.flatMap((b) =>
      b.href
        ? [
            {
              label: `${placeOf(journey)} › ${titleOf(b.href) ?? t.lift}`,
              href: b.href,
            },
          ]
        : [],
    ),
  };
}

/** One step, worded: its state, what it waits for, who acts, what follows. */
function stepFacts({ journey, step }: Found): string[] {
  const t = fr.assistant.stepStatus;
  const place = `${placeOf(journey)} › ${step.title}`;
  const facts = [t.state(place, t.states[step.status])];
  if (step.status === "done") {
    if (step.summary) facts.push(t.summary(step.summary));
    return facts;
  }
  if (step.why) facts.push(t.why(step.why));
  const prereqs = prereqsOf(step, journey.steps);
  const missing = prereqs.filter((p) => !p.done);
  for (const p of missing)
    facts.push(t.prereqMissing(withModule(p), p.source ?? null));
  if (prereqs.length > 0 && missing.length === 0) facts.push(t.prereqsDone);
  if (step.blocked) facts.push(t.reported);
  if (step.actor)
    facts.push(
      actionLine(
        { module: journey.module, place: placeOf(journey), step },
        step.actor.viewer,
      ),
    );
  else if (OPEN_STATUSES.includes(step.status)) facts.push(t.nobody);
  const next = nextOf(step, journey.steps);
  if (next.length > 0)
    facts.push(t.next(next.map((n) => `« ${withModule(n)} »`).join(", ")));
  return facts;
}

/**
 * The step of the page PO was opened from (docs/ASSISTANT.md § 3): read
 * from the project's journeys, the same ones its pages and « Maintenant »
 * show, and for the Mixage and the Mastering the blockers of their page.
 * Every sentence is written by code; RLS decides what is visible.
 */
export async function stepStatus(pagePath: string | null) {
  const t = fr.assistant.stepStatus;
  const page = pageRecord(pagePath);
  if (!pagePath || page?.kind !== "project" || !page.section)
    return { found: false as const, facts: [t.noProjectPage], sources: [] };
  const project = await getProject(page.id);
  if (!project)
    return { found: false as const, facts: [t.projectNotFound], sources: [] };

  const { journeys } = await loadShellJourneys(page.id);
  const found = stepsOfPage(journeys, pagePath);
  if (found.length === 0)
    return { found: false as const, facts: [t.noStep], sources: [] };

  const rounds = await Promise.all(
    found.map(({ journey, step }) => roundFacts(page.id, journey, step)),
  );
  const facts = found.flatMap((f, i) => [...stepFacts(f), ...rounds[i].facts]);
  const sources: Source[] = [
    ...found.map(({ journey, step }) => ({
      label: `${project.title} · ${placeOf(journey)} › ${step.title}`,
      href: actionHref(step),
    })),
    ...rounds.flatMap((r) => r.sources),
  ];
  return {
    found: true as const,
    facts: [
      t.page(`${project.title} · ${placeOf(found[0].journey)}`),
      ...facts,
    ],
    sources: uniqueSources(sources),
  };
}
