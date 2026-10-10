import "server-only";

import { tool } from "ai";
import { z } from "zod";

import {
  readSaidDate,
  understood,
} from "@/lib/assistant/propose/said-date-field";
import {
  centsToEuros,
  type DraftChange,
  type ProjectDraft,
} from "@/lib/assistant/drafts";
import { formatDay } from "@/lib/assistant/facts";
import { change, findNamed } from "@/lib/assistant/propose/match";
import {
  proposalResult,
  type ProposeContext,
} from "@/lib/assistant/propose/result";
import { parseSaidEuros } from "@/lib/assistant/verbatim";
import { can } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { listArtistOptions, listMasterOptions } from "@/lib/catalog/queries";
import { masterLabel } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";
import { listContentFormats } from "@/lib/projects/content-formats";
import { listCreativePeople } from "@/lib/projects/creatives";
import { projectKindLabel } from "@/lib/projects/labels";
import {
  getProject,
  listAssignablePeople,
  listProjects,
} from "@/lib/projects/queries";
import {
  CREATABLE_PROJECT_TYPES,
  MUSIC_FORMATS,
  PRIORITIES,
  contentModeOf,
} from "@/lib/projects/types";

const said = (what: string) =>
  z
    .string()
    .max(40)
    .optional()
    .describe(`${what}, recopié exactement tel que l'utilisateur l'a écrit`);

export function proposeProjectTool({ access, verbatim }: ProposeContext) {
  return tool({
    description:
      "Prépare la création d'un projet, ou la modification d'un projet pas encore lancé : titre, type (music_release = musical, content = contenu ; pas d'événement ni de partenariat), format musical et masters du catalogue pour un projet musical, format PDS existant (PDS Mic…) et artiste facultatif pour un contenu, chef de projet et direction créative (création seulement), échéance, budget, priorité, contexte initial. N'enregistre RIEN : l'utilisateur relit le formulaire pré-rempli et enregistre lui-même.",
    inputSchema: z.object({
      existingProject: z
        .string()
        .max(200)
        .optional()
        .describe(
          "Titre du projet existant à modifier ; absent pour en créer un",
        ),
      title: z.string().max(200).optional(),
      type: z.enum(CREATABLE_PROJECT_TYPES).optional(),
      musicFormat: z
        .enum(MUSIC_FORMATS)
        .optional()
        .describe("Format d'un projet musical : single, ep, album…"),
      contentFormat: z
        .string()
        .max(120)
        .optional()
        .describe(
          "Nom du format PDS existant d'un contenu ; absent pour un contenu ponctuel",
        ),
      artist: z
        .string()
        .max(200)
        .optional()
        .describe("Artiste d'un contenu, s'il en concerne un"),
      masters: z
        .array(z.string().max(200))
        .max(20)
        .optional()
        .describe("Noms des titres du catalogue à rattacher"),
      manager: z.string().max(100).optional().describe("Nom du chef de projet"),
      creatives: z
        .array(z.string().max(100))
        .max(10)
        .optional()
        .describe("Noms des directeurs créatifs"),
      dueDate: said(
        "Échéance, recopiée telle que dite (« 4 décembre », « 4 décembre 2026 »)",
      ),
      budget: said("Budget en euros"),
      priority: z.enum(PRIORITIES).optional(),
      notes: z
        .string()
        .max(20000)
        .optional()
        .describe("Contexte initial : ce qu'on sait déjà du projet"),
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
        const found = findNamed(
          projects,
          input.existingProject,
          (p) => p.title,
          warnings,
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

      const [allMasters, formats, artists] = await Promise.all([
        listMasterOptions(),
        input.contentFormat ? listContentFormats() : [],
        input.artist ? listArtistOptions() : [],
      ]);
      const format = input.contentFormat
        ? findNamed(formats, input.contentFormat, (f) => f.name, warnings)
        : null;
      if (input.contentFormat && !format)
        warnings.push(t.unknownFormat(input.contentFormat));
      const artist = input.artist
        ? findNamed(artists, input.artist, (a) => a.name, warnings)
        : null;
      const pendingArtist =
        input.artist && !artist ? input.artist.trim() : null;
      if (pendingArtist) warnings.push(t.pendingArtist(pendingArtist));
      let masters = current?.masters ?? [];
      const pendingMasters: string[] = [];
      if (input.masters?.length) {
        masters = input.masters.flatMap((title) => {
          const found = findNamed(
            allMasters,
            title,
            (m) => masterLabel(m),
            warnings,
          );
          if (!found) {
            warnings.push(t.pendingMaster(title));
            pendingMasters.push(title.trim());
          }
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
          const found = findNamed(
            managers,
            input.manager,
            (p) => p.name,
            warnings,
          );
          if (!found) warnings.push(t.unknownPerson(input.manager));
          assigneePersonId = found?.personId ?? null;
        }
        creativePersonIds = (input.creatives ?? []).flatMap((name) => {
          const found = findNamed(creatives, name, (p) => p.name, warnings);
          if (!found) warnings.push(t.unknownPerson(name));
          return found ? [found.personId] : [];
        });
      }

      const due = readSaidDate(
        verbatim,
        input.dueDate,
        labels.dueDate,
        warnings,
      );
      const dueDate = due?.date ?? null;
      const budgetQuote = verbatim.quote(input.budget);
      const budgetCents = budgetQuote ? parseSaidEuros(budgetQuote) : null;
      if (input.budget && budgetCents === null)
        warnings.push(t.notSaid(labels.budget));

      const currentBudget = centsToEuros(current?.budgetCents ?? null);
      const type = input.type ?? current?.type ?? null;
      const contentFormatId = format?.id ?? current?.contentFormat?.id ?? null;
      const values: ProjectDraft["values"] = {
        title: input.title?.trim() || current?.title || "",
        type,
        musicFormat: input.musicFormat ?? current?.musicFormat ?? null,
        contentMode:
          type !== "content"
            ? null
            : contentFormatId
              ? "format"
              : input.contentFormat
                ? "format"
                : current
                  ? contentModeOf(current)
                  : null,
        contentFormatId,
        artistId: artist?.id ?? current?.artistId ?? null,
        masterIds: [...new Set(masters.map((m) => m.id))],
        pendingArtist,
        pendingMasters,
        assigneePersonId,
        creativePersonIds: [...new Set(creativePersonIds)],
        dueDate: dueDate ?? current?.dueDate ?? "",
        budget:
          budgetCents !== null ? centsToEuros(budgetCents) : currentBudget,
        priority: input.priority ?? current?.priority ?? null,
        initialContext: input.notes?.trim() || current?.initialContext || "",
      };

      const shell = fr.shell;
      const changes: DraftChange[] = [];
      const formatName = (id: string | null) =>
        id === current?.contentFormat?.id
          ? (current?.contentFormat?.name ?? null)
          : (format?.name ?? null);
      const kindLabel = (
        v: Pick<
          ProjectDraft["values"],
          "type" | "musicFormat" | "contentFormatId"
        >,
      ) =>
        v.type
          ? projectKindLabel({
              type: v.type,
              musicFormat: v.musicFormat,
              contentFormatName: formatName(v.contentFormatId),
            })
          : null;
      const mastersLabel = (list: typeof masters) =>
        list.map((m) => masterLabel(m)).join(", ");
      change(changes, labels.title, current?.title, values.title);
      change(
        changes,
        labels.type,
        current
          ? kindLabel({
              type: current.type,
              musicFormat: current.musicFormat,
              contentFormatId: current.contentFormat?.id ?? null,
            })
          : null,
        kindLabel(values),
      );
      if (artist) change(changes, labels.artist, null, artist.name);
      else if (pendingArtist)
        change(changes, labels.artist, null, t.toCreate(pendingArtist));
      change(
        changes,
        labels.masters,
        current ? mastersLabel(current.masters) : null,
        [
          mastersLabel(
            allMasters.filter((m) => values.masterIds.includes(m.id)),
          ),
          ...pendingMasters.map(t.toCreate),
        ]
          .filter(Boolean)
          .join(", "),
      );
      if (input.manager && assigneePersonId)
        change(changes, labels.manager, null, input.manager);
      change(
        changes,
        labels.dueDate,
        current?.dueDate ? formatDay(current.dueDate) : null,
        due
          ? understood(due)
          : values.dueDate
            ? formatDay(values.dueDate)
            : null,
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
      change(
        changes,
        labels.initialContext,
        current?.initialContext,
        values.initialContext,
      );

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
