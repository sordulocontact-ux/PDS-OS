import "server-only";

import { tool } from "ai";
import { z } from "zod";

import {
  readSaidDate,
  understood,
} from "@/lib/assistant/propose/said-date-field";
import type { DraftChange } from "@/lib/assistant/drafts";
import { change } from "@/lib/assistant/propose/match";
import {
  proposalResult,
  type ProposeContext,
} from "@/lib/assistant/propose/result";
import {
  isRefusal,
  namedMembers,
  ownedLaunchedProject,
} from "@/lib/assistant/propose/targets";
import {
  parseSaidBudgetStatus,
  parseSaidEuros,
} from "@/lib/assistant/verbatim";
import { centsToEuros } from "@/lib/assistant/drafts";
import { routes } from "@/lib/auth/redirects";
import { BUDGET_FAMILIES } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";

const project = z
  .string()
  .max(200)
  .optional()
  .describe("Titre du projet ; absent = le projet de la page ouverte");

const said = (what: string) =>
  z
    .string()
    .max(60)
    .optional()
    .describe(`${what}, recopié exactement tel que l'utilisateur l'a écrit`);

/**
 * propose_task: a task on a launched project, which only its owner writes.
 * Owner and due date stay the person's choice in the form: PO only pre-fills
 * what the user said.
 */
export function proposeTaskTool({
  access,
  verbatim,
  pagePath,
}: ProposeContext) {
  return tool({
    description:
      "Prépare une tâche sur un projet lancé (liste Travail du projet) : intitulé, personne responsable, échéance. Seul le chef de projet responsable du projet peut en créer. N'enregistre RIEN : l'utilisateur relit le formulaire pré-rempli et enregistre lui-même.",
    inputSchema: z.object({
      project,
      title: z.string().min(1).max(300).describe("Ce qu'il faut faire"),
      assignee: z
        .string()
        .max(100)
        .optional()
        .describe("Nom de la personne responsable"),
      dueDate: said(
        "Échéance, recopiée telle que dite (« vendredi », « 13 octobre », « dans 2 semaines »)",
      ),
    }),
    execute: async (input) => {
      const t = fr.assistantRecords;
      const labels = fr.projectWork.work.add;
      const warnings: string[] = [];
      const target = await ownedLaunchedProject(
        access,
        input.project,
        pagePath,
        warnings,
      );
      if (isRefusal(target)) return target;

      const [assignee] = await namedMembers(
        access,
        input.assignee ? [input.assignee] : [],
        warnings,
      );
      const due = readSaidDate(
        verbatim,
        input.dueDate,
        labels.dueDate,
        warnings,
      );
      const dueDate = due?.date ?? null;
      if (!dueDate) warnings.push(t.dueDateToChoose);

      const changes: DraftChange[] = [];
      change(changes, t.labels.project, null, target.title);
      change(changes, labels.label, null, input.title.trim());
      change(changes, labels.assignee, null, assignee?.name);
      change(changes, labels.dueDate, null, due ? understood(due) : null);

      return proposalResult({
        draft: {
          kind: "task",
          projectId: target.id,
          projectTitle: target.title,
          values: {
            title: input.title.trim(),
            assigneePersonId: assignee?.personId ?? null,
            dueDate: dueDate ?? "",
          },
        },
        title: t.titles.createTask(input.title.trim()),
        changes,
        warnings,
        source: { label: target.title, href: routes.projectWork(target.id) },
      });
    },
  });
}

/**
 * propose_budget_line: a new spend of a launched project (its owner only).
 * Amount and state come from the user's words, read by code; existing lines
 * are never read (the budget stays out of PO's answers).
 */
export function proposeBudgetLineTool({
  access,
  verbatim,
  pagePath,
}: ProposeContext) {
  return tool({
    description:
      "Prépare une nouvelle ligne de dépense dans le budget d'un projet lancé : libellé, montant, état (prévu, engagé, payé), famille, note. Seul le chef de projet responsable peut en créer. N'enregistre RIEN : l'utilisateur relit le formulaire pré-rempli et enregistre lui-même.",
    inputSchema: z.object({
      project,
      label: z.string().min(1).max(200).describe("Ce que paie la dépense"),
      amount: said("Montant en euros"),
      status: said(
        "État de la dépense dans les mots de l'utilisateur (« déjà payé », « engagé »)",
      ),
      family: z.enum(BUDGET_FAMILIES).optional(),
      note: z.string().max(1000).optional(),
    }),
    execute: async (input) => {
      const t = fr.assistantRecords;
      const labels = fr.budget.form;
      const warnings: string[] = [];
      const target = await ownedLaunchedProject(
        access,
        input.project,
        pagePath,
        warnings,
      );
      if (isRefusal(target)) return target;

      const amountQuote = verbatim.quote(input.amount);
      const cents = amountQuote ? parseSaidEuros(amountQuote) : null;
      if (input.amount && cents === null)
        warnings.push(fr.assistant.drafts.notSaid(labels.amount));
      const statusQuote = verbatim.quote(input.status);
      const status = statusQuote ? parseSaidBudgetStatus(statusQuote) : null;
      if (input.status && !status)
        warnings.push(fr.assistant.drafts.notSaid(labels.status));

      const changes: DraftChange[] = [];
      change(changes, t.labels.project, null, target.title);
      change(changes, labels.label, null, input.label.trim());
      change(
        changes,
        labels.amount,
        null,
        cents !== null ? `${centsToEuros(cents)} €` : null,
      );
      change(
        changes,
        labels.status,
        null,
        status ? fr.budget.statuses[status] : null,
      );
      change(
        changes,
        labels.family,
        null,
        input.family ? fr.framing.needs.families[input.family] : null,
      );
      change(changes, labels.note, null, input.note?.trim());

      return proposalResult({
        draft: {
          kind: "budgetLine",
          projectId: target.id,
          projectTitle: target.title,
          values: {
            label: input.label.trim(),
            amount: centsToEuros(cents),
            status,
            family: input.family ?? null,
            note: input.note?.trim() ?? "",
          },
        },
        title: t.titles.createBudgetLine(input.label.trim()),
        changes,
        warnings,
        source: { label: target.title, href: routes.projectBudget(target.id) },
      });
    },
  });
}
