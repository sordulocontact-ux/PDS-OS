import "server-only";

import { tool } from "ai";
import { z } from "zod";

import type { Access } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import {
  isReadResult,
  projectSource,
  readFailed,
  targetProject,
  type ReadResult,
} from "@/lib/assistant/read/target";
import { formatDay, lateness } from "@/lib/assistant/facts";
import type { Source } from "@/lib/assistant/sources";
import { uniqueSources } from "@/lib/assistant/sources";
import { assistant } from "@/lib/i18n/fr/assistant";
import { assistantReadWorkflows } from "@/lib/i18n/fr/assistant-read-workflows";
import { budget } from "@/lib/i18n/fr/budget";
import { placeOf, type ModuleJourney } from "@/lib/journey/types";
import { todayInParis } from "@/lib/insights/dates";
import { loadFinalView } from "@/lib/master-workflow/final";
import { loadRoundStep } from "@/lib/master-workflow/round-step";
import { loadShellJourneys } from "@/lib/overview/journeys";
import { getProject } from "@/lib/projects/queries";
import { actionHref, type JourneyStep } from "@/lib/ui/journey";
import { formatAmount } from "@/lib/utils/money";

const fr = { assistantReadWorkflows, assistant, budget };
const t = fr.assistantReadWorkflows;

/**
 * One journey step, worded by code (state in French, who acts, due date
 * with its lateness). Shared by the Master, Distribution and Marketing
 * readers: the journeys are what the pages show.
 */
export function stepLines(
  journey: ModuleJourney,
  steps: JourneyStep[] = journey.steps,
): ReadResult {
  const facts: string[] = [];
  const sources: Source[] = [];
  for (const step of steps) {
    const place = `${placeOf(journey)} › ${step.title}`;
    facts.push(t.step.line(place, fr.assistant.stepStatus.states[step.status]));
    if (step.summary && step.status === "done")
      facts.push(t.step.summary(step.summary));
    if (step.reserve) facts.push(t.step.reserve);
    if (step.actor && step.status !== "done")
      facts.push(
        t.step.actor(step.actor.name, step.actor.todo, step.actor.viewer),
      );
    if (step.due && step.status !== "done")
      facts.push(
        t.step.due(formatDay(step.due), lateness(step.due < todayInParis())),
      );
    sources.push({ label: place, href: actionHref(step) });
  }
  return { facts, sources };
}

const shorten = (text: string) => {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 600 ? `${flat.slice(0, 600)}…` : flat;
};

/** Mixage or Mastering: engineer, hand-over, rate, versions, blockers. */
async function roundFacts(
  projectId: string,
  stage: "mix" | "mastering",
): Promise<ReadResult> {
  const r = t.master.round;
  const label = t.master.stages[stage];
  const round = await loadRoundStep(projectId, stage);
  const facts: string[] = [];
  const engineer = round.inHouse?.name ?? round.view.engineer?.name ?? null;
  facts.push(
    engineer
      ? r.engineer(label, engineer, round.inHouse !== null)
      : r.noEngineer(label),
  );
  if (!round.inHouse) {
    const link = round.link;
    if (!link) facts.push(r.notSent(label));
    else if (revokedOf(link)) facts.push(r.revoked(label));
    else {
      facts.push(
        link.linkSentAt
          ? r.sent(label, formatDay(link.linkSentAt))
          : r.linkNotSent(label),
      );
      facts.push(
        link.acknowledgedAt
          ? r.taken(label, formatDay(link.acknowledgedAt))
          : r.notTaken(label),
      );
      if (link.deliveredAt)
        facts.push(r.delivered(label, formatDay(link.deliveredAt)));
    }
  }
  for (const rate of round.rates) {
    const est =
      rate.estimateCents !== null
        ? r.rateEstimate(formatAmount(rate.estimateCents))
        : "";
    facts.push(
      r.rate(
        t.master.stages[rate.stage],
        formatAmount(rate.amountCents),
        r.rateStatus[rate.status] ?? fr.budget.statuses[rate.status],
        est,
      ),
    );
    if (rate.refusal)
      facts.push(
        r.rateRefused(
          t.master.stages[rate.stage],
          formatAmount(rate.refusal.cents),
          shorten(rate.refusal.reason),
          formatDay(rate.refusal.at),
        ),
      );
  }
  const versions = round.versions;
  facts.push(versions.decider ? r.decider(versions.decider) : r.noDecider);
  for (const title of versions.titles) {
    const latest = title.versions[0];
    if (!latest) {
      facts.push(r.noVersion(label, title.title));
      continue;
    }
    facts.push(r.current(label, title.title, latest.number));
    if (title.finalNumber !== null)
      facts.push(r.finalVersion(title.finalNumber));
    else if (!latest.decision) facts.push(r.received(latest.number));
    if (latest.feedbackSentAt)
      facts.push(
        r.feedbackSent(latest.number, formatDay(latest.feedbackSentAt)),
      );
    const decided = title.versions.find((v) => v.decision);
    if (decided) {
      const day = decided.decidedAt ? formatDay(decided.decidedAt) : null;
      facts.push(
        decided.decision === "approved"
          ? r.approved(decided.number, day, decided.decidedBy)
          : r.changes(decided.number, day, decided.decidedBy),
      );
      if (decided.decisionNote)
        facts.push(r.decisionNote(shorten(decided.decisionNote)));
    }
    if (latest.feedbackSummary)
      facts.push(r.feedback(shorten(latest.feedbackSummary)));
    for (const c of latest.comments.slice(0, 5))
      facts.push(r.comment(c.author, null, shorten(c.body)));
  }
  if (round.blockers.length === 0) facts.push(r.noBlocker(label));
  for (const b of round.blockers) facts.push(r.blocker(label, b.text));
  return {
    facts,
    sources: round.blockers.flatMap((b) =>
      b.href ? [{ label: `${label} › ${b.text}`, href: b.href }] : [],
    ),
  };
}

const revokedOf = (link: { revokedAt: string | null }) =>
  link.revokedAt !== null;

async function finalFacts(projectId: string): Promise<string[]> {
  const f = t.master.final;
  const [project, access] = await Promise.all([
    getProject(projectId),
    requireApproved(),
  ]);
  if (!project) return [];
  const view = await loadFinalView(project, access);
  if (view.titles.length === 0) return [f.noTitle];
  return view.titles.map((title) =>
    title.final
      ? f.validated(
          title.title,
          title.final.number,
          formatDay(title.final.decidedAt),
          title.final.decidedBy,
        )
      : title.before
        ? f.before(title.title)
        : f.pending(title.title),
  );
}

/**
 * The Master of a project as its pages show it (docs/ASSISTANT.md § 3):
 * steps, engineer, hand-over, rate, versions and decisions, blockers, final.
 * Session of the user, RLS decides; every state is worded by code.
 */
export function masterStatusTool(_access: Access, pagePath: string | null) {
  return tool({
    description:
      "Le Master d'un projet : chaque étape (Source, Brief, Mixage, Mastering, Master final) et son état ; pour le Mixage et le Mastering : l'ingénieur, s'il a pris le dossier en charge, son tarif (accepté ou refusé), la version en cours, la dernière décision et le texte du retour recopié, qui valide, ce qui empêche d'envoyer le dossier ; et si le master final est livré. À appeler pour « on en est à quelle version du mix ? », « qu'a dit l'ingé au dernier retour ? », « le master final est livré ? ». Sans nom de projet : celui de la page ouverte.",
    inputSchema: z.object({
      project: z
        .string()
        .max(100)
        .optional()
        .describe("Titre du projet, même approximatif ; vide = page ouverte"),
    }),
    execute: async ({ project }): Promise<ReadResult> => {
      try {
        const target = await targetProject(project, pagePath);
        if (isReadResult(target)) return target;
        const id = target.project.id;
        const { journeys } = await loadShellJourneys(id);
        const master = journeys.filter((j) => j.module === "master");
        if (master.length === 0)
          return {
            facts: [...target.notes, t.notOpen(t.master.workflow)],
            sources: [projectSource(target.project)],
          };
        const facts = [...target.notes, t.project(target.project.title)];
        const sources: Source[] = [projectSource(target.project)];
        for (const journey of master) {
          const lines = stepLines(journey);
          facts.push(...lines.facts);
          sources.push(...lines.sources);
        }
        const keys = new Set(master.flatMap((j) => j.steps.map((s) => s.key)));
        const rounds = await Promise.all(
          (["mix", "mastering"] as const)
            .filter((k) => keys.has(k))
            .map((k) => roundFacts(id, k)),
        );
        for (const round of rounds) {
          facts.push(...round.facts);
          sources.push(...round.sources);
        }
        if (keys.has("final")) facts.push(...(await finalFacts(id)));
        return {
          facts,
          sources: uniqueSources(sources),
        };
      } catch (error) {
        console.error("masterStatus:", error);
        return readFailed();
      }
    },
  });
}
