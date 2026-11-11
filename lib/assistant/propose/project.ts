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
import { loadCollectiveContext } from "@/lib/projects/collective-context";
import { selectionGuests } from "@/lib/projects/collective-rules";
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
      "Prépare la création d'un projet, ou la modification d'un projet pas encore lancé : titre, type (music_release = musical, content = contenu ; pas d'événement ni de partenariat), format musical et masters du catalogue pour un projet musical, format PDS existant (PDS Mic…) et artiste facultatif pour un contenu, projet collectif (plusieurs artistes et plusieurs titres dans un seul projet, modèle PDS Mic : artiste principal, PDS par défaut, et sélection d'artistes à importer ; création seulement), chef de projet et direction créative (création seulement), échéance, budget, priorité, contexte initial. N'enregistre RIEN : l'utilisateur relit le formulaire pré-rempli et enregistre lui-même.",
    inputSchema: z.object({
      existingProject: z
        .string()
        .max(200)
        .optional()
        .describe(
          "Titre du projet existant à modifier ; absent pour en créer un",
        ),
      title: z.string().max(200).optional(),
      type: z
        .enum(CREATABLE_PROJECT_TYPES)
        .optional()
        .describe(
          "Type, seulement s'il est dit ; absent pour un projet collectif sur le modèle PDS Mic (un contenu, choisi d'office)",
        ),
      musicFormat: z
        .enum(MUSIC_FORMATS)
        .optional()
        .describe("Format d'un projet musical : single, ep, album…"),
      contentFormat: z
        .string()
        .max(120)
        .optional()
        .describe(
          "Nom du format PDS existant d'un contenu ; absent pour un contenu ponctuel, et pour un projet collectif sur le modèle PDS Mic (choisi d'office). Jamais le nom d'une sélection d'artistes",
        ),
      artist: z
        .string()
        .max(200)
        .optional()
        .describe(
          "Artiste d'un contenu, s'il en concerne un ; pour un projet collectif, son artiste principal (PDS si rien n'est dit)",
        ),
      collective: z
        .boolean()
        .optional()
        .describe(
          "Projet collectif (modèle PDS Mic) : plusieurs artistes et plusieurs titres dans un seul projet, chacun avec son suivi ; jamais un projet par artiste",
        ),
      selection: z
        .string()
        .max(120)
        .optional()
        .describe(
          "Nom de la sélection d'artistes du Catalogue à importer dans un projet collectif (chaque artiste reçoit un titre sans nom et une participation proposée)",
        ),
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

      // A collective (lot 5 of docs/pds-mic-plan.md) is chosen at creation;
      // an existing project stays what it is.
      const wantsCollective =
        input.collective ?? (input.selection ? true : undefined);
      if (current && wantsCollective !== undefined) {
        if (wantsCollective !== current.collective)
          warnings.push(t.collectiveAtCreation);
        else if (input.selection) warnings.push(t.selectionAtCreation);
      }
      const collective = current
        ? current.collective
        : (wantsCollective ?? false);

      const [allMasters, formats, artists] = await Promise.all([
        listMasterOptions(),
        input.contentFormat || collective ? listContentFormats() : [],
        input.artist || collective ? listArtistOptions() : [],
      ]);
      const collectiveContext =
        collective && !current
          ? await loadCollectiveContext(access, artists, formats)
          : null;
      // A selection's name given as the format (seen in tests, 11/11/2026:
      // « PDS MIC #7 · hiver » read as the format « PDS Mic »): it is the
      // selection, never a format; the model's format applies.
      const sameName = (a: string, b: string) =>
        a
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .trim()
          .toLowerCase() ===
        b
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .trim()
          .toLowerCase();
      const formatIsSelection = Boolean(
        input.contentFormat &&
        ((input.selection && sameName(input.contentFormat, input.selection)) ||
          collectiveContext?.selections.some((s) =>
            sameName(s.name, input.contentFormat ?? ""),
          )),
      );
      const saidFormat = formatIsSelection ? undefined : input.contentFormat;
      const saidSelection =
        input.selection ??
        (formatIsSelection ? input.contentFormat : undefined);
      const namedFormat = saidFormat
        ? findNamed(formats, saidFormat, (f) => f.name, warnings)
        : null;
      // A new collective starts from the PDS Mic model unless told otherwise.
      const modelFormatId = collectiveContext?.modelFormatId ?? null;
      const format =
        namedFormat ??
        (modelFormatId && !saidFormat && (input.type ?? "content") === "content"
          ? (formats.find((f) => f.id === modelFormatId) ?? null)
          : null);
      if (saidFormat && !format) warnings.push(t.unknownFormat(saidFormat));
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

      const selection = saidSelection
        ? findNamed(
            collectiveContext?.selections ?? [],
            saidSelection,
            (s) => s.name,
            warnings,
          )
        : null;
      if (saidSelection && !current && !selection)
        warnings.push(t.unknownSelection(saidSelection));
      const mainArtistId = collective
        ? (artist?.id ??
          current?.artistId ??
          (pendingArtist ? null : (collectiveContext?.houseArtistId ?? null)))
        : null;
      if (collective && !mainArtistId && !pendingArtist)
        warnings.push(t.noMainArtist);

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
        } else if (selection) {
          // The selection's holder runs it, when they may (the form's rule).
          const holder = (await listAssignablePeople(organizationId)).find(
            (p) => p.personId === selection.holder.personId,
          );
          assigneePersonId = holder?.personId ?? null;
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
      const type =
        input.type ?? current?.type ?? (collective ? "content" : null);
      const contentFormatId = format?.id ?? current?.contentFormat?.id ?? null;
      const values: ProjectDraft["values"] = {
        title: input.title?.trim() || current?.title || selection?.name || "",
        type,
        musicFormat: input.musicFormat ?? current?.musicFormat ?? null,
        contentMode:
          type !== "content"
            ? null
            : contentFormatId
              ? "format"
              : saidFormat
                ? "format"
                : current
                  ? contentModeOf(current)
                  : null,
        contentFormatId,
        artistId: collective ? null : (artist?.id ?? current?.artistId ?? null),
        collective,
        mainArtistId,
        selectionId: current ? null : (selection?.id ?? null),
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
      const c = fr.shell.newProject.collective;
      if (collective && !current)
        change(changes, c.label, null, t.collectiveYes);
      const artistLabel = collective ? c.mainArtist : labels.artist;
      const mainArtist = collective
        ? artists.find((a) => a.id === mainArtistId)
        : null;
      if (artist) change(changes, artistLabel, null, artist.name);
      else if (pendingArtist)
        change(changes, artistLabel, null, t.toCreate(pendingArtist));
      else if (mainArtist && !current)
        change(changes, artistLabel, null, mainArtist.name);
      if (selection)
        change(
          changes,
          c.selection,
          null,
          t.selectionGuests(
            selection.name,
            selectionGuests(selection, mainArtistId).guests.length,
          ),
        );
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
