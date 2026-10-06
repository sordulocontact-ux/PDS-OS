import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { TITLE_ITEMS } from "@/lib/assistant/draft-records";
import { pageRecord } from "@/lib/assistant/page-context";
import { findNamed } from "@/lib/assistant/propose/match";
import {
  proposalResult,
  type ProposeContext,
} from "@/lib/assistant/propose/result";
import {
  splitKindOf,
  titleItemValues,
} from "@/lib/assistant/propose/title-item-values";
import { can } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import {
  CONTRIBUTOR_ROLES,
  ORGANISMS,
  SESSION_KINDS,
  SPLIT_KINDS,
  SPLIT_ROLES,
} from "@/lib/catalog/master/rules";
import { listMasterOptions } from "@/lib/catalog/queries";
import { masterLabel } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";

const text = (max: number, what?: string) => {
  const field = z.string().max(max).optional();
  return what ? field.describe(what) : field;
};
const said = (what: string) =>
  text(60, `${what}, recopié exactement tel que l'utilisateur l'a écrit`);

/**
 * propose_title_item (manage_catalog): a credit, a session, a track or a
 * share added to a title, its rights (ISWC, ℗), or a declaration to a
 * collecting society — the title page's own forms, pre-filled.
 */
export function proposeTitleItemTool({
  access,
  verbatim,
  pagePath,
}: ProposeContext) {
  return tool({
    description:
      "Prépare un ajout à la fiche d'un titre du catalogue : item = contributor (crédit : auteur, compositeur, producteur, ingé, musicien), session (enregistrement, mixage, mastering), track (piste du multipiste), split (part master ou édition d'un ayant droit), rights (ISWC, titulaire et année du ℗), declaration (dépôt SACEM, SCPP, SPPF, ADAMI ou SPEDIDAM). N'enregistre RIEN : l'utilisateur relit le formulaire de la fiche, pré-rempli, et enregistre lui-même.",
    inputSchema: z.object({
      title: text(200, "Nom du titre ; absent = la fiche titre ouverte"),
      item: z.enum(TITLE_ITEMS),
      name: text(
        200,
        "Nom du contributeur, de la piste ou de l'ayant droit d'une part",
      ),
      contributorRole: z.enum(CONTRIBUTOR_ROLES).optional(),
      detail: text(200, "Précision d'un crédit : instrument, détail"),
      sessionKind: z.enum(SESSION_KINDS).optional(),
      date: said("Date d'une session ou d'un dépôt, avec l'année"),
      studio: text(200),
      engineer: text(200, "Ingénieur du son d'une session"),
      performer: text(200, "Interprète d'une piste"),
      notes: text(2000),
      splitKind: z.enum(SPLIT_KINDS).optional(),
      splitRole: z.enum(SPLIT_ROLES).optional(),
      share: said("Part en pourcentage"),
      organism: z.enum(ORGANISMS).optional(),
      status: said(
        "État du dépôt dans les mots de l'utilisateur (« déposée », « confirmée »)",
      ),
      reference: said("Référence du dépôt"),
      iswc: said("ISWC"),
      rightsHolder: text(200, "Titulaire du ℗"),
      rightsYear: said("Année du ℗"),
    }),
    execute: async (input) => {
      const t = fr.assistantRecords;
      if (!access.organizationId || !can(access, "manage_catalog"))
        return { facts: [fr.assistant.drafts.forbiddenCatalog], sources: [] };

      const warnings: string[] = [];
      const masters = await listMasterOptions();
      const page = pageRecord(pagePath);
      const master = input.title?.trim()
        ? findNamed(masters, input.title, (m) => masterLabel(m), warnings)
        : page?.kind === "master"
          ? (masters.find((m) => m.id === page.id) ?? null)
          : null;
      if (!master)
        return {
          facts: [
            input.title
              ? fr.assistant.drafts.notFound(
                  fr.assistant.drafts.what.master,
                  input.title,
                )
              : t.whichTitle,
          ],
          sources: [],
        };
      if (input.item === "declaration" && !input.organism)
        return { facts: [t.whichOrganism], sources: [] };

      const { defaults, changes } = titleItemValues(
        input.item,
        input,
        verbatim,
        warnings,
      );
      const splitKind = splitKindOf(input.splitKind, input.splitRole);
      const label = masterLabel(master);
      const items = t.titleItems;
      const what =
        input.item === "split"
          ? items.split(fr.masterPage.splits.kinds[splitKind])
          : input.item === "declaration"
            ? items.declaration(
                fr.masterPage.declarations.organisms[input.organism!],
              )
            : items[input.item];

      return proposalResult({
        draft: {
          kind: "titleItem",
          item: input.item,
          masterId: master.id,
          masterTitle: label,
          splitKind,
          organism: input.organism ?? null,
          defaults,
        },
        title: t.titles.titleItem(what, label),
        changes,
        warnings,
        source: { label, href: routes.master(master.id) },
      });
    },
  });
}
