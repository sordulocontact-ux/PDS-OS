import "server-only";

import { tool } from "ai";
import { z } from "zod";

import {
  centsToEuros,
  type DraftChange,
  type ProjectDraft,
} from "@/lib/assistant/drafts";
import { formatDay } from "@/lib/assistant/facts";
import { change, matchByName } from "@/lib/assistant/propose/match";
import {
  proposalResult,
  type ProposeContext,
} from "@/lib/assistant/propose/result";
import { parseSaidDate, parseSaidEuros } from "@/lib/assistant/verbatim";
import { can } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { listMasterOptions } from "@/lib/catalog/queries";
import { masterLabel } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";
import { listCreativePeople } from "@/lib/projects/creatives";
import {
  getProject,
  listAssignablePeople,
  listProjects,
} from "@/lib/projects/queries";
import { PRIORITIES, PROJECT_TYPES } from "@/lib/projects/types";

const said = (what: string) =>
  z
    .string()
    .max(40)
    .optional()
    .describe(`${what}, recopié exactement tel que l'utilisateur l'a écrit`);

export function proposeProjectTool({ access, verbatim }: ProposeContext) {
  return tool({
    description:
      "Prépare la création d'un projet, ou la modification d'un projet pas encore lancé : titre, type, masters, chef de projet et direction artistique (création seulement), échéance, budget, priorité, notes de cadrage. N'enregistre RIEN : l'utilisateur relit le formulaire pré-rempli et enregistre lui-même.",
    inputSchema: z.object({
      existingProject: z
        .string()
        .max(200)
        .optional()
        .describe(
          "Titre du projet existant à modifier ; absent pour en créer un",
        ),
      title: z.string().max(200).optional(),
      type: z.enum(PROJECT_TYPES).optional(),
      masters: z
        .array(z.string().max(200))
        .max(20)
        .optional()
        .describe("Titres des masters à rattacher"),
      manager: z.string().max(100).optional().describe("Nom du chef de projet"),
      creatives: z
        .array(z.string().max(100))
        .max(10)
        .optional()
        .describe("Noms des directeurs créatifs"),
      dueDate: said("Échéance avec l'année"),
      budget: said("Budget en euros"),
      priority: z.enum(PRIORITIES).optional(),
      notes: z.string().max(20000).optional().describe("Notes de cadrage"),
    }),
    execute: async (input) => {
      const t = fr.assistant.drafts;
      const organizationId = access.organizationId;
      if (!organizationId || !can(access, "create_projects"))
        return { facts: [t.forbiddenProjects], sources: [] };

      const labels = fr.shell.newProject.fields;
      const warnings: string[] = [];
      let current = null;
      if (input.existingProject) {
        const { projects } = await listProjects();
        const found = matchByName(
          projects,
          input.existingProject,
          (p) => p.title,
        );
        current = found ? await getProject(found.id) : null;
        if (!current)
          return {
            facts: [t.notFound(t.what.project, input.existingProject)],
            sources: [],
          };
        if (current.status === "launched")
          return {
            facts: [t.launched(current.title)],
            sources: [
              { label: current.title, href: routes.project(current.id) },
            ],
          };
      }

      const allMasters = await listMasterOptions();
      let masters = current?.masters ?? [];
      if (input.masters?.length) {
        masters = input.masters.flatMap((title) => {
          const found = matchByName(allMasters, title, (m) => masterLabel(m));
          if (!found) warnings.push(t.unknownMaster(title));
          return found ? [found] : [];
        });
      }

      let assigneePersonId: string | null = null;
      let creativePersonIds: string[] = [];
      if (current && (input.manager || input.creatives?.length)) {
        warnings.push(t.teamByTransmission);
      } else if (!current) {
        const [managers, creatives] = await Promise.all([
          input.manager ? listAssignablePeople(organizationId) : [],
          input.creatives?.length ? listCreativePeople(organizationId) : [],
        ]);
        if (input.manager) {
          const found = matchByName(managers, input.manager, (p) => p.name);
          if (!found) warnings.push(t.unknownPerson(input.manager));
          assigneePersonId = found?.personId ?? null;
        }
        creativePersonIds = (input.creatives ?? []).flatMap((name) => {
          const found = matchByName(creatives, name, (p) => p.name);
          if (!found) warnings.push(t.unknownPerson(name));
          return found ? [found.personId] : [];
        });
      }

      const dueQuote = verbatim.quote(input.dueDate);
      const dueDate = dueQuote ? parseSaidDate(dueQuote) : null;
      if (input.dueDate && !dueDate) warnings.push(t.notSaid(labels.dueDate));
      const budgetQuote = verbatim.quote(input.budget);
      const budgetCents = budgetQuote ? parseSaidEuros(budgetQuote) : null;
      if (input.budget && budgetCents === null)
        warnings.push(t.notSaid(labels.budget));

      const currentBudget = centsToEuros(current?.budgetCents ?? null);
      const values: ProjectDraft["values"] = {
        title: input.title?.trim() || current?.title || "",
        type: input.type ?? current?.type ?? null,
        masterIds: [...new Set(masters.map((m) => m.id))],
        assigneePersonId,
        creativePersonIds: [...new Set(creativePersonIds)],
        dueDate: dueDate ?? current?.dueDate ?? "",
        budget:
          budgetCents !== null ? centsToEuros(budgetCents) : currentBudget,
        priority: input.priority ?? current?.priority ?? null,
        framingNotes: input.notes?.trim() || current?.framingNotes || "",
      };

      const shell = fr.shell;
      const changes: DraftChange[] = [];
      const typeLabel = (v: ProjectDraft["values"]["type"]) =>
        v ? shell.projectTypes[v] : null;
      const mastersLabel = (list: typeof masters) =>
        list.map((m) => masterLabel(m)).join(", ");
      change(changes, labels.title, current?.title, values.title);
      change(
        changes,
        labels.type,
        typeLabel(current?.type ?? null),
        typeLabel(values.type),
      );
      change(
        changes,
        labels.masters,
        current ? mastersLabel(current.masters) : null,
        mastersLabel(allMasters.filter((m) => values.masterIds.includes(m.id))),
      );
      if (input.manager && assigneePersonId)
        change(changes, labels.manager, null, input.manager);
      change(
        changes,
        labels.dueDate,
        current?.dueDate ? formatDay(current.dueDate) : null,
        values.dueDate ? formatDay(values.dueDate) : null,
      );
      change(
        changes,
        labels.budget,
        currentBudget && `${currentBudget} €`,
        values.budget && `${values.budget} €`,
      );
      change(
        changes,
        labels.priority,
        current?.priority ? shell.priorities[current.priority] : null,
        values.priority ? shell.priorities[values.priority] : null,
      );
      change(changes, labels.notes, current?.framingNotes, values.framingNotes);

      return proposalResult({
        draft: { kind: "project", projectId: current?.id ?? null, values },
        title: current
          ? t.titles.updateProject(current.title)
          : t.titles.createProject(values.title),
        changes,
        warnings,
        source: current
          ? { label: current.title, href: routes.project(current.id) }
          : null,
      });
    },
  });
}
