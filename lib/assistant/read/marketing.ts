import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { formatDay, lateness } from "@/lib/assistant/facts";
import { stepLines } from "@/lib/assistant/read/master";
import {
  capped,
  isReadResult,
  projectSource,
  readFailed,
  targetProject,
  type ReadResult,
} from "@/lib/assistant/read/target";
import { uniqueSources, type Source } from "@/lib/assistant/sources";
import { loadActivationPeople } from "@/lib/activations/people";
import { loadActivationsBoard } from "@/lib/activations/board";
import type { Access } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { loadSheetsPage } from "@/lib/design/sheets-page";
import { activations } from "@/lib/i18n/fr/activations";
import { assistantReadWorkflows } from "@/lib/i18n/fr/assistant-read-workflows";
import { conception } from "@/lib/i18n/fr/conception";
import { strategyPilot } from "@/lib/i18n/fr/strategy-pilot";
import { todayInParis } from "@/lib/insights/dates";
import type { ModuleJourney } from "@/lib/journey/types";
import { loadShellJourneys } from "@/lib/overview/journeys";
import { getProject } from "@/lib/projects/queries";
import { loadBriefSource } from "@/lib/strategy/documents/brief-source";

const fr = { assistantReadWorkflows, activations, conception, strategyPilot };
const t = fr.assistantReadWorkflows.marketing;
const MAX_ACTIVATIONS = 25;

const PARTS = [
  "strategy",
  "design",
  "production",
  "activations",
  "review",
] as const;
type Part = (typeof PARTS)[number];

const partOf = (journey: ModuleJourney): Part | null => {
  const key = journey.part?.key ?? "";
  return key.startsWith("production")
    ? "production"
    : (PARTS as readonly string[]).includes(key)
      ? (key as Part)
      : null;
};

async function strategyFacts(projectId: string, access: Access) {
  const brief = await loadBriefSource(projectId, access);
  if (!brief) return { facts: [t.strategy.notStarted], sources: [] };
  const s = t.strategy;
  return {
    facts: [
      ...brief.statuses.map((d) =>
        s.dimension(
          fr.strategyPilot.dimensions[d.key],
          fr.strategyPilot.states[d.state],
          d.summary,
        ),
      ),
      s.brief(brief.data.briefValidated),
    ],
    sources: [
      { label: t.parts.strategy, href: routes.projectStrategy(projectId) },
    ],
  };
}

async function designFacts(projectId: string, access: Access) {
  const detail = await getProject(projectId);
  const page = detail ? await loadSheetsPage(detail, access) : null;
  if (!page) return { facts: [], sources: [] };
  const facts = [t.design.deliverables(page.data.deliverables.length)];
  if (page.sheets.length === 0) facts.push(t.design.none);
  for (const sheet of page.sheets) {
    const deliverable = page.data.deliverables.find(
      (d) => d.id === sheet.sheet.design_deliverable_id,
    );
    facts.push(
      t.design.sheet(
        deliverable?.title ?? sheet.sheet.kind,
        fr.conception.sheetStatuses[sheet.status],
      ),
    );
  }
  return {
    facts,
    sources: [
      {
        label: t.parts.design,
        href: routes.projectDesignSheets(projectId),
      },
    ],
  };
}

async function activationFacts(projectId: string): Promise<ReadResult> {
  const a = t.activations;
  const [board, people] = await Promise.all([
    loadActivationsBoard(projectId),
    loadActivationPeople(projectId),
  ]);
  const list = board.summaries;
  if (list.length === 0) return { facts: [a.none], sources: [] };
  const today = todayInParis();
  const facts: string[] = [];
  for (const x of list.slice(0, MAX_ACTIVATIONS)) {
    const owner = x.ownerPersonId ? people.person(x.ownerPersonId).name : null;
    facts.push(a.line(x.title, fr.activations.statuses[x.status], owner));
    facts.push(
      x.dueOn ? a.due(formatDay(x.dueOn), lateness(x.dueOn < today)) : a.noDue,
    );
    if (x.proof === "to_provide" || x.proof === "contested")
      facts.push(a.proof(fr.activations.proof.states[x.proof]), a.proofMissing);
    if (x.blocked) facts.push(a.blocked);
    if (x.waitsFor) facts.push(a.waitsFor(x.waitsFor));
  }
  facts.push(...capped(list.length, Math.min(list.length, MAX_ACTIVATIONS)));
  return {
    facts,
    sources: [
      {
        label: t.parts.activations,
        href: routes.projectActivations(projectId),
      },
    ],
  };
}

/**
 * The Marketing of a project as its pages show it: Stratégie (eight
 * dimensions, Brief de sortie), Conception (sheets), Production, Activations
 * and Suivi & bilan. Steps come from the journeys, the pages' own source.
 */
export function marketingStatusTool(_access: Access, pagePath: string | null) {
  return tool({
    description:
      "Le Marketing d'un projet : Stratégie (8 dimensions et leur état, Brief de sortie validé ou non), Conception (étapes, fiches livrables et leur état), Production (livrables, étape de chacun, devis), Activations (liste, statut, responsable, échéance, preuves manquantes), Suivi & bilan (bilan, réserves, clôture). Sans `part` : un résumé court par partie ; avec `part` : le détail d'une seule. À appeler pour « où en est le marketing ? », « quelles activations sont en retard ? », « le Brief de sortie est validé ? ». Sans nom de projet : celui de la page ouverte.",
    inputSchema: z.object({
      project: z
        .string()
        .max(100)
        .optional()
        .describe("Titre du projet, même approximatif ; vide = page ouverte"),
      part: z
        .enum(PARTS)
        .optional()
        .describe(
          "Une seule partie : strategy, design, production, activations ou review",
        ),
    }),
    execute: async ({ project, part }): Promise<ReadResult> => {
      try {
        const target = await targetProject(project, pagePath);
        if (isReadResult(target)) return target;
        const id = target.project.id;
        const { journeys } = await loadShellJourneys(id);
        const own = journeys.filter((j) => j.module === "marketing");
        const sources: Source[] = [projectSource(target.project)];
        if (own.length === 0)
          return {
            facts: [
              ...target.notes,
              fr.assistantReadWorkflows.notOpen(t.workflow),
            ],
            sources,
          };
        const facts = [
          ...target.notes,
          fr.assistantReadWorkflows.project(target.project.title),
        ];

        if (!part) {
          for (const key of PARTS) {
            const steps = own
              .filter((j) => partOf(j) === key)
              .flatMap((j) => j.steps);
            if (steps.length === 0) continue;
            facts.push(
              t.summary(
                t.parts[key],
                steps.length,
                steps.filter((s) => s.status === "done").length,
              ),
            );
            const now = steps.find((s) => s.actor && s.status !== "done");
            const journey = own.find((j) => j.steps.includes(now ?? steps[0]));
            if (now && journey) {
              const lines = stepLines(journey, [now]);
              facts.push(...lines.facts);
              sources.push(...lines.sources);
            }
          }
          facts.push(t.askPart);
          return { facts, sources: uniqueSources(sources) };
        }

        for (const journey of own.filter((j) => partOf(j) === part)) {
          const lines = stepLines(journey);
          facts.push(...lines.facts);
          sources.push(...lines.sources);
        }
        const access = await requireApproved();
        const extra =
          part === "strategy"
            ? await strategyFacts(id, access)
            : part === "design"
              ? await designFacts(id, access)
              : part === "activations"
                ? await activationFacts(id)
                : { facts: [], sources: [] };
        facts.push(...extra.facts);
        sources.push(...extra.sources);
        return { facts, sources: uniqueSources(sources) };
      } catch (error) {
        console.error("marketingStatus:", error);
        return readFailed();
      }
    },
  });
}
