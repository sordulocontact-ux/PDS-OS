import "server-only";

import { tool } from "ai";
import { z } from "zod";

import {
  isReadResult,
  projectSource,
  readFailed,
  targetProject,
  capped,
  type ReadResult,
} from "@/lib/assistant/read/target";
import type { Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { loadBudget } from "@/lib/budget/queries";
import { budgetTotals, formatEuros } from "@/lib/budget/types";
import { assistantReadPilot } from "@/lib/i18n/fr/assistant-read-pilot";
import { budget } from "@/lib/i18n/fr/budget";
import { canSeeProjectBudget } from "@/lib/projects/edit-access";
import { getProject } from "@/lib/projects/queries";

const fr = { assistantReadPilot, budget };
const MAX_LINES = 30;

/** The budget of a project, totals computed by the page's own function. */
export async function readBudget(
  access: Access,
  name: string | undefined,
  pagePath: string | null,
): Promise<ReadResult> {
  const t = fr.assistantReadPilot.budget;
  const target = await targetProject(name, pagePath);
  if (isReadResult(target)) return target;
  const { project: listed, notes } = target;
  const project = await getProject(listed.id);
  if (!project) return readFailed();
  const source = {
    label: `${project.title} · Budget`,
    href: routes.projectBudget(project.id),
  };
  // Visibility is the page's: the owner and the direction only.
  if (!canSeeProjectBudget(access, project))
    return { facts: [...notes, t.hidden], sources: [projectSource(project)] };
  if (project.stages.length === 0)
    return {
      facts: [...notes, t.notLaunched(project.title)],
      sources: [projectSource(project)],
    };

  const { error, lines } = await loadBudget(project.id);
  if (error) return readFailed();
  const totals = budgetTotals(lines, project.budgetCents);
  const s = fr.budget.statuses;
  const eur = (cents: number) => formatEuros(cents);
  const rest = totals.remainingCents;
  const facts = [
    ...notes,
    project.budgetCents === null
      ? t.noEnvelope
      : t.envelope(eur(project.budgetCents)),
    t.total(s.planned, eur(totals.plannedCents)),
    t.total(s.proposed, eur(totals.proposedCents)),
    t.total(s.committed, eur(totals.committedCents)),
    t.total(s.invoiced, eur(totals.invoicedCents)),
    t.total(s.paid, eur(totals.paidCents)),
    t.committedNote,
    ...(rest === null
      ? []
      : [rest < 0 ? t.overrun(eur(-rest)) : t.rest(eur(rest))]),
    ...(lines.length === 0 ? [t.noLines] : []),
    ...lines
      .slice(0, MAX_LINES)
      .map((l) =>
        t.line(
          l.label,
          eur(l.amountCents),
          s[l.status],
          l.family ? fr.budget.families[l.family] : "",
        ),
      ),
    ...capped(lines.length, MAX_LINES),
  ];
  return { facts, sources: [source] };
}

export function budgetTool(access: Access, pagePath: string | null) {
  return tool({
    description:
      "Lit le budget d'un projet : enveloppe, totaux par statut (estimé, proposé, engagé, facturé, payé), reste ou dépassement, et les lignes de dépense, tous calculés par l'application. À appeler pour « combien il reste sur Lueur ? », « qu'est-ce qui est engagé ? ». Réservé au responsable du projet et à la direction.",
    inputSchema: z.object({
      project: z
        .string()
        .max(100)
        .optional()
        .describe("Nom du projet ; absent pour le projet de la page ouverte"),
    }),
    execute: async ({ project }) => {
      try {
        return await readBudget(access, project, pagePath);
      } catch (error) {
        console.error("readBudget:", error);
        return readFailed();
      }
    },
  });
}
