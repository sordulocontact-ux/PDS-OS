// Facts of the État des lieux read from a project's titles (identifiers,
// splits, declarations; credits in people-facts.ts), built by code from rows already read
// (rule 6: the model never decides a state). Pure, so the rules read and
// test alone.
import { routes } from "@/lib/auth/redirects";
import {
  ORGANISMS,
  formatShare,
  splitTotal,
  type DeclarationStatus,
  type MasterDeclaration,
  type MasterSplit,
  type Organism,
  type SplitKind,
} from "@/lib/catalog/master/rules";
import { groupOf } from "@/lib/facts/types";
import { fr } from "@/lib/i18n/fr";
import { formatDate } from "@/lib/release/format";
import {
  TITLE_IDENTIFIERS,
  type LegalFact,
  type LegalFactStatus,
  type LegalTitleRow,
} from "@/lib/legal/types";

export type InventoryMaster = {
  id: string;
  title: string;
  artists: string;
  // Rank in the project (0 first): decides the title's hue.
  position: number;
  isrc: string | null;
  iswc: string | null;
  rightsHolder: string | null;
  rightsYear: number | null;
};

const t = fr.legal.inventory;

/** A title and its three identifiers: known once filled, else missing. */
export function titleRow(master: InventoryMaster): LegalTitleRow {
  const cell = (value: string | null) => ({
    value,
    status: (value ? "known" : "missing") as LegalFactStatus,
    statusLabel: value ? t.states.filled : t.states.empty,
  });
  return {
    masterId: master.id,
    title: master.title,
    rights: {
      iswc: master.iswc,
      rightsHolder: master.rightsHolder,
      rightsYear: master.rightsYear,
    },
    artists: master.artists,
    href: routes.master(master.id),
    cells: {
      isrc: cell(master.isrc),
      iswc: cell(master.iswc),
      rightsHolder: cell(master.rightsHolder),
    },
  };
}

/** The same identifiers as facts, so the counts include them. */
export function titleFacts(row: LegalTitleRow): LegalFact[] {
  return TITLE_IDENTIFIERS.map((identifier) => ({
    key: `${identifier}-${row.masterId}`,
    label: t.facts[identifier],
    detail: row.title,
    source: t.sources.title,
    status: row.cells[identifier].status,
    statusLabel: row.cells[identifier].statusLabel,
    href: row.href,
  }));
}

const SPLIT_STATUS: Record<string, LegalFactStatus> = {
  complete: "known",
  incomplete: "to_confirm",
  empty: "missing",
};

// What proves the rights behind a complete split (JUR-01): the signed
// contracts of the project's parties, and the publishing split confirmed by
// each person in the Juridique.
export type SplitProof = {
  signedPartyIds: ReadonlySet<string>;
  publishing: { confirmed: boolean; since: string | null } | null;
};

/**
 * Two facts per split kind (JUR-01): the split as filled in (« Répartition
 * renseignée »), and, once it is complete, whether the rights are secured
 * (« Droits sécurisés ») — never the same thing.
 */
export function splitFacts(
  master: InventoryMaster,
  splits: MasterSplit[],
  canEdit: boolean,
  proof: SplitProof,
): LegalFact[] {
  const labels = fr.masterPage.splits;
  return (["master", "publishing"] as const satisfies SplitKind[]).flatMap(
    (kind) => {
      const total = splitTotal(splits, kind);
      const filled: LegalFact = {
        key: `split-${kind}-${master.id}`,
        label: labels.kinds[kind],
        detail: null,
        group: groupOf(master),
        source: t.sources.splits,
        status: SPLIT_STATUS[total.status],
        statusLabel:
          total.status === "complete"
            ? t.states.splitFilled
            : total.status === "empty"
              ? labels.status.empty
              : labels.status.incomplete(formatShare(total.remaining)),
        href: routes.masterSplits(master.id),
        action: canEdit
          ? {
              kind: "edit_splits",
              masterId: master.id,
              title: master.title,
              splitKind: kind,
              shares: splits,
            }
          : undefined,
      };
      if (total.status !== "complete") return [filled];
      return [filled, securedFact(master, kind, splits, proof)];
    },
  );
}

function securedFact(
  master: InventoryMaster,
  kind: SplitKind,
  splits: MasterSplit[],
  proof: SplitProof,
): LegalFact {
  const base = {
    key: `split-secured-${kind}-${master.id}`,
    label: t.facts.secured[kind],
    detail: null,
    group: groupOf(master),
  };
  if (kind === "publishing") {
    const confirmed = proof.publishing?.confirmed ?? false;
    return {
      ...base,
      source: t.sources.legalSplits,
      status: confirmed ? "known" : "to_confirm",
      statusLabel: confirmed
        ? t.states.securedConfirmed
        : t.states.securedToConfirm,
      href: routes.masterSplits(master.id),
    };
  }
  // Master: every party with a share has a signed contract in the project.
  const parties = splits.filter((s) => s.kind === kind && s.share > 0);
  const missing = parties.filter(
    (s) => !s.contactId || !proof.signedPartyIds.has(s.contactId),
  );
  return {
    ...base,
    source: t.sources.contracts,
    status: missing.length === 0 ? "known" : "to_confirm",
    statusLabel:
      missing.length === 0
        ? t.states.securedSigned
        : t.states.securedMissing(missing.map((s) => s.party).join(", ")),
    href: routes.masterSplits(master.id),
  };
}
const DECLARATION_STATUS: Record<DeclarationStatus, LegalFactStatus> = {
  confirmed: "known",
  submitted: "to_confirm",
  rejected: "missing",
};

/**
 * The declarations filed for a title, in the organisms' order, or one
 * "none" fact. Organisms not filed are not listed one by one: which ones a
 * release needs is not decided yet (ADAMI is not a pre-release formality,
 * SCPP and SPPF are alternatives), so listing all five as missing would
 * claim a rule nobody set.
 */
export function declarationFacts(
  master: InventoryMaster,
  filed: Map<Organism, MasterDeclaration>,
  canEdit: boolean,
): LegalFact[] {
  const labels = fr.masterPage.declarations;
  const rows = ORGANISMS.flatMap((organism) => {
    const declaration = filed.get(organism);
    return declaration ? [declaration] : [];
  });
  if (rows.length === 0)
    return [
      {
        key: `declarations-${master.id}`,
        label: t.facts.declarations,
        detail: null,
        group: groupOf(master),
        source: t.sources.declarations,
        status: "missing",
        statusLabel: t.states.noDeclaration,
        href: routes.masterRights(master.id),
        action: canEdit
          ? { kind: "declare", masterId: master.id, title: master.title }
          : undefined,
      },
    ];
  return rows.map((declaration) => ({
    key: `declaration-${declaration.organism}-${master.id}`,
    label: labels.organisms[declaration.organism],
    // Its reference and the day it was filed (JUR-02): what the state rests on.
    detail:
      [
        declaration.reference ? t.declarationRef(declaration.reference) : null,
        declaration.date
          ? t.declarationOn(formatDate(declaration.date))
          : t.declarationNoDate,
      ]
        .filter(Boolean)
        .join(" · ") || null,
    group: groupOf(master),
    source: t.sources.declarations,
    status: DECLARATION_STATUS[declaration.status],
    statusLabel: labels.statuses[declaration.status],
    href: routes.masterRights(master.id),
    action: canEdit
      ? { kind: "edit_declaration", masterId: master.id, declaration }
      : undefined,
  }));
}
