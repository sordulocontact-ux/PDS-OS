import { routes } from "@/lib/auth/redirects";
import type { DossierRow } from "@/lib/catalog/master/dossier";
import type { MasterRights } from "@/lib/catalog/master/rules";
import { masterPage } from "@/lib/i18n/fr/master-page";

import type { DossierActionTarget } from "./dossier-action";

const fr = { masterPage };

/** What a row opens: to fill it, or to change it once it is done. */
export function dossierTarget(
  row: DossierRow,
  masterId: string,
  rights: MasterRights,
): DossierActionTarget | null {
  if (row.locked) return null;
  switch (row.key) {
    case "isrc":
      return { kind: "title" };
    case "rightsHolder":
    case "iswc":
      return { kind: "rights", rights };
    case "contributors":
      return row.done
        ? { kind: "link", href: routes.masterCredits(masterId) }
        : { kind: "contributor" };
    case "masterSplits":
    case "publishingSplits":
      return row.done
        ? { kind: "link", href: routes.masterCredits(masterId) }
        : {
            kind: "split",
            splitKind: row.key === "masterSplits" ? "master" : "publishing",
            available: row.remaining ?? 100,
          };
    case "declarations":
      return { kind: "link", href: routes.masterRights(masterId) };
    case "masterFile":
      return row.done
        ? null
        : { kind: "link", href: routes.masterAudio(masterId) };
  }
}

/** The verb that fills a row (« Renseigner l'ISRC », « Qualifier 5 organismes »). */
export function dossierVerb(row: DossierRow): string {
  const verbs = fr.masterPage.overview.dossier.verbs;
  return row.key === "declarations"
    ? verbs.declarations(row.toQualify ?? 0)
    : verbs[row.key];
}
