import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { pageRecord } from "@/lib/assistant/page-context";
import { findNamed } from "@/lib/assistant/propose/match";
import { readFailed, type ReadResult } from "@/lib/assistant/read/target";
import type { Source } from "@/lib/assistant/sources";
import { can, type Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { groupContributors } from "@/lib/catalog/master/contributor-groups";
import {
  loadTitleDossier,
  missingOf,
  type DossierRow,
} from "@/lib/catalog/master/dossier";
import {
  getMasterRights,
  listMasterContributors,
  listMasterDeclarations,
} from "@/lib/catalog/master/queries";
import { formatIswc, pLine } from "@/lib/catalog/master/rules";
import { getMaster, listMasters } from "@/lib/catalog/queries";
import { formatIsrc, masterLabel } from "@/lib/catalog/types";
import { catalog } from "@/lib/i18n/fr/catalog";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { assistantReadLegal } from "@/lib/i18n/fr/assistant-read-legal";

const fr = { assistantReadLegal, catalog, masterPage };
const t = fr.assistantReadLegal.title;

const row = (rows: DossierRow[], key: DossierRow["key"]) =>
  rows.find((r) => r.key === key);

/** A split row of the dossier: complete (100 %), partial or empty. */
function splitFact(
  rows: DossierRow[],
  key: "masterSplits" | "publishingSplits",
) {
  const r = row(rows, key);
  const label = t.splits[key === "masterSplits" ? "master" : "publishing"];
  if (!r) return t.splitEmpty(label);
  if (r.done) return t.splitComplete(label, r.value ?? "");
  return r.value
    ? t.splitIncomplete(
        label,
        `${r.remaining ?? 0} %`.replace(".", ","),
        r.value,
      )
    : t.splitEmpty(label);
}

export function titleSheetTool(access: Access, pagePath: string | null) {
  return tool({
    description:
      "Lit la fiche d'un titre du catalogue (celui nommé, sinon celui de la fiche ouverte) : artistes, état audio, ISRC, ISWC, titulaire et année du ℗ (proposé ou confirmé), contributeurs et rôles, splits master et édition (100 % ou ce qui manque), déclarations par organisme, Master final validé ou non, projets, et ce qui reste à faire au dossier. À appeler pour « le titre est-il prêt à sortir ? », « quel est l'ISRC de… ? », « les splits sont-ils complets ? », « qui a produit ce titre ? ».",
    inputSchema: z.object({
      title: z
        .string()
        .max(100)
        .optional()
        .describe("Nom du titre ; absent pour le titre de la fiche ouverte"),
    }),
    execute: async ({ title }): Promise<ReadResult> => {
      try {
        const page = pageRecord(pagePath);
        const { masters, error } = await listMasters();
        if (error) return readFailed();
        const notes: string[] = [];
        const id = title?.trim()
          ? (findNamed(masters, title, (m) => masterLabel(m), notes)?.id ??
            findNamed(masters, title, (m) => m.title, notes)?.id)
          : page?.kind === "master"
            ? page.id
            : undefined;
        if (!id)
          return {
            facts: [title?.trim() ? t.notFound(title.trim()) : t.which],
            sources: [],
          };
        const master = await getMaster(id);
        if (!master) return { facts: [t.notFound(title ?? "")], sources: [] };
        const rights = await getMasterRights(id);
        if (!rights) return readFailed();
        const withSplits = can(access, "manage_catalog");
        const [dossier, people, declared] = await Promise.all([
          loadTitleDossier({
            masterId: id,
            isrc: master.isrc,
            finalValidated: master.finalValidatedAt !== null,
            rights,
            withSplits,
          }),
          listMasterContributors(id),
          listMasterDeclarations(id),
        ]);
        const facts = [...notes, t.head(masterLabel(master), master.artists)];
        facts.push(
          master.audioState
            ? t.audio(fr.catalog.audioStates[master.audioState])
            : t.audioUnknown,
          master.isrc ? t.isrc(formatIsrc(master.isrc)) : t.noIsrc,
          rights.iswc ? t.iswc(formatIswc(rights.iswc)) : t.noIswc,
        );
        const holder = pLine(rights);
        facts.push(
          holder
            ? t.holder(
                rights.rightsHolder ?? "",
                rights.rightsYear ? t.holderYear(rights.rightsYear) : "",
                rights.confirmedAt
                  ? t.holderConfirmed(
                      rights.confirmedBy ? t.holderBy(rights.confirmedBy) : "",
                    )
                  : t.holderProposed,
              )
            : t.noHolder,
        );
        const roles = fr.masterPage.credits.roles;
        const groups = groupContributors(people.contributors);
        facts.push(
          groups.length > 0
            ? t.contributors(
                groups
                  .map((g) =>
                    t.contributor(
                      g.name,
                      g.roles.map((r) => roles[r]).join(", "),
                    ),
                  )
                  .join(" · "),
              )
            : t.noContributors,
        );
        facts.push(
          ...(withSplits
            ? [
                splitFact(dossier, "masterSplits"),
                splitFact(dossier, "publishingSplits"),
              ]
            : [t.splitsHidden]),
        );
        const organisms = fr.masterPage.declarations.organisms;
        facts.push(
          declared.declarations.length > 0
            ? t.declarations(
                declared.declarations
                  .map((d) =>
                    t.declaration(organisms[d.organism], t.statuses[d.status]),
                  )
                  .join(", "),
              )
            : t.noDeclarations,
          master.finalValidatedAt ? t.final.yes : t.final.no,
          master.projects.length > 0
            ? t.projects(master.projects.map((p) => p.title).join(", "))
            : t.noProjects,
        );
        const missing = missingOf(dossier);
        facts.push(
          missing.length > 0
            ? t.missing(missing.map((k) => t.labels[k]).join(", "))
            : t.allDone,
        );
        const sources: Source[] = [
          { label: masterLabel(master), href: routes.master(id) },
          {
            label: `${master.title} · Crédits`,
            href: routes.masterCredits(id),
          },
          { label: `${master.title} · Droits`, href: routes.masterRights(id) },
        ];
        return { facts, sources };
      } catch {
        return readFailed();
      }
    },
  });
}
