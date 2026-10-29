import "server-only";

import {
  listMasterContributors,
  listMasterDeclarations,
  listMasterSplits,
} from "@/lib/catalog/master/queries";
import { groupContributors } from "@/lib/catalog/master/contributor-groups";
import {
  DECLARATION_STATUSES,
  ORGANISMS,
  declarationsSummary,
  formatIswc,
  formatShare,
  pLine,
  splitTotal,
  type MasterRights,
  type SplitKind,
} from "@/lib/catalog/master/rules";
import { formatIsrc } from "@/lib/catalog/types";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { formatInstant } from "@/lib/utils/instant";

const fr = { masterPage };

// The title's dossier (proto `docs/protos/titre.html`, Sacha 29/10/2026):
// one row per piece, its value when known, what the release needs first.
// Done states and values computed here, never by the model; the next
// action reads the same rows.

export type DossierKey =
  | "isrc"
  | "rightsHolder"
  | "masterSplits"
  | "publishingSplits"
  | "masterFile"
  | "iswc"
  | "contributors"
  | "declarations";

export type DossierRow = {
  key: DossierKey;
  // Needed to release the title (retour Catalogue 12), or after.
  group: "release" | "later";
  done: boolean;
  // What is known, even when not complete yet (shares, declarations).
  value: string | null;
  // Where the value stands or comes from (« Proposé, à confirmer… »).
  note: string | null;
  // Done elsewhere only (the Master final, validated in Audio).
  locked: boolean;
  // Splits: what a new share may take. Declarations: organisms to qualify.
  remaining?: number;
  toQualify?: number;
};

const SPLIT_ROW: Record<SplitKind, DossierKey> = {
  master: "masterSplits",
  publishing: "publishingSplits",
};

/**
 * Every row of the dossier, release first. Splits are read by
 * manage_catalog only (RLS): without it their rows are left out, as on the
 * Crédits tab. A list that fails to load counts as not done.
 */
export async function loadTitleDossier(input: {
  masterId: string;
  isrc: string | null;
  // An approved Master final (retour 13: deposited is not validated).
  finalValidated: boolean;
  rights: MasterRights;
  withSplits: boolean;
}): Promise<DossierRow[]> {
  const { masterId, rights } = input;
  const t = fr.masterPage;
  const [{ contributors }, { declarations }, shares] = await Promise.all([
    listMasterContributors(masterId),
    listMasterDeclarations(masterId),
    input.withSplits ? listMasterSplits(masterId) : null,
  ]);

  const splitRow = (kind: SplitKind): DossierRow => {
    const parts = (shares?.splits ?? []).filter((s) => s.kind === kind);
    const total = splitTotal(parts, kind);
    return {
      key: SPLIT_ROW[kind],
      group: "release",
      done: total.status === "complete",
      value:
        parts.map((s) => `${s.party} ${formatShare(s.share)}`).join(" · ") ||
        null,
      note:
        total.status === "incomplete"
          ? t.overview.dossier.remaining(formatShare(total.remaining))
          : null,
      locked: false,
      remaining: total.remaining,
    };
  };

  const filed = declarations.map((d) => ({
    organism: d.organism,
    status: d.status,
  }));
  const summary = declarationsSummary(filed);
  // « 1 déposée · 4 à vérifier »: each status the organisms are in.
  const byStatus = new Map<string, number>();
  for (const organism of ORGANISMS) {
    const status =
      filed.find((d) => d.organism === organism)?.status ?? "to_verify";
    byStatus.set(status, (byStatus.get(status) ?? 0) + 1);
  }
  const declarationsValue = DECLARATION_STATUSES.filter((s) => byStatus.has(s))
    .map(
      (s) =>
        `${byStatus.get(s)} ${t.declarations.statuses[s].toLocaleLowerCase("fr")}`,
    )
    .join(" · ");

  const people = groupContributors(contributors);
  const rows: DossierRow[] = [
    {
      key: "isrc",
      group: "release",
      done: input.isrc !== null,
      value: input.isrc ? formatIsrc(input.isrc) : null,
      note: null,
      locked: false,
    },
    {
      key: "rightsHolder",
      group: "release",
      done: rights.rightsHolder !== null,
      value: pLine(rights) ?? rights.rightsHolder,
      note: rights.rightsHolder
        ? rights.confirmedAt
          ? t.rights.confirmed(
              formatInstant(rights.confirmedAt),
              rights.confirmedBy ?? null,
            )
          : t.rights.proposed
        : null,
      locked: false,
    },
    ...(input.withSplits ? [splitRow("master"), splitRow("publishing")] : []),
    {
      key: "masterFile",
      group: "release",
      done: input.finalValidated,
      value: input.finalValidated ? t.overview.dossier.masterFileDone : null,
      note: null,
      locked: !input.finalValidated,
    },
    {
      key: "iswc",
      group: "later",
      done: rights.iswc !== null,
      value: rights.iswc ? formatIswc(rights.iswc) : null,
      note: null,
      locked: false,
    },
    {
      key: "contributors",
      group: "later",
      done: people.length > 0,
      value: people.map((p) => p.name).join(", ") || null,
      note: null,
      locked: false,
    },
    {
      key: "declarations",
      group: "later",
      // Only the applicable declarations count (retour 14).
      done: summary.toQualify === 0 && summary.done === summary.applicable,
      value: summary.toQualify < ORGANISMS.length ? declarationsValue : null,
      note: null,
      locked: false,
      toQualify: summary.toQualify,
    },
  ];
  return rows;
}

/** What is still to do, the release first: the next action's candidates. */
export const missingOf = (rows: DossierRow[]): DossierKey[] =>
  rows.filter((r) => !r.done && !r.locked).map((r) => r.key);
