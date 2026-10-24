// The split editor's model (recette Juridique V1, JUR-01): who created the
// work, who publishes each creator's share, then the parts typed by a person.
// Publishers are never typed: they follow from each creator's publishing
// (PDS Éditions, another publisher picked in the Réseau, coedition, none),
// and none ever gets a part from the code. Client-safe.

import { fr } from "@/lib/i18n/fr";
import type { SplitLine } from "@/lib/legal/splits/queries";
import {
  FULL,
  exactShare,
  formatShare,
  isCreatorRole,
  shareOf,
  totalUnits,
  unitsOf,
  type CreatorRole,
} from "@/lib/legal/splits/shares";

export type PublishingMode = "house" | "other" | "none";

/** What PDS OS knows of a creator's publishing, and from where. */
export type PublishingHint = {
  mode: PublishingMode | null;
  coedition: boolean;
  source: string | null;
};

export type CreatorDraft = {
  key: number;
  name: string;
  role: CreatorRole | null;
  contactId: string | null;
  creditId: string | null;
  share: string;
  mode: PublishingMode | null;
  publisher: { contactId: string; name: string } | null;
  coedition: boolean;
  // « Proposé : … », under the choice.
  source: string | null;
};

export type PublisherDraft = {
  // "house" or "contact:<id>".
  key: string;
  name: string;
  house: boolean;
  contactId: string | null;
  // The creators it represents, by key.
  represents: number[];
};

export type SplitDraft = {
  creators: CreatorDraft[];
  // Each publisher's part, by its key.
  publisherShares: Record<string, string>;
  note: string;
};

export const HOUSE_KEY = "house";

/** The publishers that follow from each creator's publishing: the house
 * first, then each publisher of the Réseau once. */
export function publishersOf(creators: CreatorDraft[]): PublisherDraft[] {
  const house: PublisherDraft = {
    key: HOUSE_KEY,
    name: fr.legalSplits.editor.house,
    house: true,
    contactId: null,
    represents: [],
  };
  const others = new Map<string, PublisherDraft>();
  for (const c of creators) {
    if (c.mode === "house" || (c.mode === "other" && c.coedition))
      house.represents.push(c.key);
    if (c.mode === "other" && c.publisher) {
      const key = `contact:${c.publisher.contactId}`;
      const known = others.get(key) ?? {
        key,
        name: c.publisher.name,
        house: false,
        contactId: c.publisher.contactId,
        represents: [],
      };
      known.represents.push(c.key);
      others.set(key, known);
    }
  }
  return [...(house.represents.length ? [house] : []), ...others.values()];
}

/** The draft a version starts from: its creators, and who publishes each
 * one's share, read from its publishers; else what PDS OS knows. */
export function draftOf(
  lines: SplitLine[],
  hintOf: (line: SplitLine) => PublishingHint | null,
): SplitDraft {
  const creators = lines.filter((l) => l.role !== "publisher");
  const publishers = lines.filter(
    (l) => l.role === "publisher" && (l.house || l.represents),
  );
  const positionOf = new Map(lines.map((l, i) => [l, i + 1]));
  const by = (line: SplitLine) =>
    publishers.filter((p) => p.represents?.includes(positionOf.get(line)!));
  const publisherShares: Record<string, string> = {};
  for (const p of publishers) {
    const key = p.house ? HOUSE_KEY : `contact:${p.contactId}`;
    if (p.units > 0) publisherShares[key] = exactShare(p.units);
  }
  return {
    note: "",
    publisherShares,
    creators: creators.map((line, key) => {
      const theirs = by(line);
      const other = theirs.find((p) => !p.house && p.contactId);
      const inHouse = theirs.some((p) => p.house);
      const hint = publishers.length === 0 ? hintOf(line) : null;
      const mode: PublishingMode | null = other
        ? "other"
        : inHouse
          ? "house"
          : publishers.length > 0
            ? "none"
            : (hint?.mode ?? null);
      return {
        key,
        name: line.name,
        role: isCreatorRole(line.role) ? line.role : null,
        contactId: line.contactId,
        creditId: line.creditId,
        share: line.units > 0 ? exactShare(line.units) : "",
        mode,
        publisher: other
          ? { contactId: other.contactId!, name: other.name }
          : null,
        coedition: other ? inHouse : (hint?.coedition ?? false),
        source: publishers.length > 0 ? null : (hint?.source ?? null),
      };
    }),
  };
}

export type DraftErrors = {
  creators: Record<
    number,
    {
      person?: string;
      role?: string;
      mode?: string;
      publisher?: string;
      share?: string;
    }
  >;
  publishers: Record<string, string>;
  total: string | null;
  note: string | null;
  count: number;
};

/** On « Enregistrer » only: each miss on its field, and the total. */
export function draftErrors(draft: SplitDraft, withNote: boolean): DraftErrors {
  const t = fr.legalSplits.editor;
  const out: DraftErrors = {
    creators: {},
    publishers: {},
    total: null,
    note: null,
    count: 0,
  };
  const publishers = publishersOf(draft.creators);
  let shareMissing = false;
  for (const c of draft.creators) {
    const e: DraftErrors["creators"][number] = {};
    if (!c.name.trim()) e.person = t.personMissing;
    if (!c.role) e.role = t.roleMissing;
    if (!c.mode) e.mode = t.modeMissing;
    if (c.mode === "other" && !c.publisher) e.publisher = t.publisherMissing;
    if (unitsOf(c.share) === null) {
      e.share = t.shareMissing(c.name || t.thisCreator, false);
      shareMissing = true;
    }
    const n = Object.keys(e).length;
    if (n) out.creators[c.key] = e;
    out.count += n;
  }
  for (const p of publishers)
    if (unitsOf(draft.publisherShares[p.key] ?? "") === null) {
      out.publishers[p.key] = t.shareMissing(p.name, true);
      shareMissing = true;
      out.count += 1;
    }
  const total = totalOf(draft);
  if (!shareMissing && total !== FULL) {
    out.total = t.totalOff(formatShare(total));
    out.count += 1;
  }
  if (withNote && !draft.note.trim()) {
    out.note = t.noteMissing;
    out.count += 1;
  }
  return out;
}

export function totalOf(draft: SplitDraft): number {
  const publishers = publishersOf(draft.creators);
  return totalUnits([
    ...draft.creators.map((c) => unitsOf(c.share)),
    ...publishers.map((p) => unitsOf(draft.publisherShares[p.key] ?? "")),
  ]);
}

/** The lines saved: the creators first, then each publisher with the
 * positions of the creators it represents. */
export function entriesOf(draft: SplitDraft) {
  const position = new Map(draft.creators.map((c, i) => [c.key, i + 1]));
  return [
    ...draft.creators.map((c) => ({
      name: c.name,
      role: c.role!,
      share: shareOf(unitsOf(c.share)!),
      contactId: c.contactId,
      creditId: c.creditId,
      represents: null,
      house: false,
    })),
    ...publishersOf(draft.creators).map((p) => ({
      name: p.name,
      role: "publisher" as const,
      share: shareOf(unitsOf(draft.publisherShares[p.key] ?? "")!),
      contactId: p.contactId,
      creditId: null,
      represents: p.represents.map((k) => position.get(k)!),
      house: p.house,
    })),
  ];
}

/** What a line is, said in full: « Éditeur · représente Mona Lys et Sami
 * Kader » for a publisher, else its role. */
export function roleOfLine(
  line: Pick<SplitLine, "role" | "represents">,
  lines: Array<Pick<SplitLine, "name">>,
): string {
  if (line.role === "publisher" && line.represents?.length)
    return fr.legalSplits.editor.represents(
      line.represents.map((p) => lines[p - 1]?.name ?? ""),
    );
  return fr.legalSplits.roles[line.role];
}
