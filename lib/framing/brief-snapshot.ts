// The Brief de cadrage as one frozen object (ticket § 7): the six
// dimensions in words, written by code from what was confirmed, plus its
// sources. Stored as each version's content (framing_briefs.content), so
// what the validator reads is exactly what was sent; two versions compare
// key by key for the history of changes. Client-safe.

import {
  assessFraming,
  formatBriefDate,
  rolesContext,
  type FramingAssessment,
} from "@/lib/framing/assess";
import {
  DIMENSIONS,
  QUESTIONS,
  type Dimension,
} from "@/lib/framing/dimensions";
import type { FramingKnowledge } from "@/lib/framing/knowledge";
import { teamBoard } from "@/lib/framing/team-board";
import { fr } from "@/lib/i18n/fr";
import { projectKindLabel } from "@/lib/projects/labels";

export type SnapshotItem = {
  key: string;
  label: string;
  // The answer in words; null = « Non renseigné ».
  value: string | null;
  // A list question: one entry per line.
  lines: string[];
  source: string | null;
};

export type BriefSnapshot = {
  schema: 1;
  project: { title: string; kind: string; artist: string };
  dimensions: Array<{
    dimension: Dimension;
    items: SnapshotItem[];
    facts: Array<{ label: string; value: string }>;
  }>;
  sources: string[];
};

/** The confirmed lines of a list question, in words. */
export function linesOf(
  key: string,
  k: FramingKnowledge,
  // The review of a call also shows what is proposed, not yet confirmed.
  { proposed = false }: { proposed?: boolean } = {},
): string[] {
  const t = fr.framingIntel;
  const confirmed = <T extends { review_status: string }>(rows: T[]) =>
    rows.filter(
      (r) =>
        r.review_status === "confirmed" ||
        (proposed && r.review_status === "proposed"),
    );
  switch (QUESTIONS[key as keyof typeof QUESTIONS]?.kind) {
    case "needs":
      return confirmed(k.framing.needs).map((n) => n.label);
    case "constraints":
      return confirmed(k.framing.constraints)
        .filter((c) => c.type !== "rights")
        .map(
          (c) =>
            `${(t.constraintTypes as Record<string, string>)[c.type] ?? t.constraintTypes.other} : ${c.text}`,
        );
    case "rights":
      return confirmed(k.framing.constraints)
        .filter((c) => c.type === "rights")
        .map((c) => c.text);
    case "deadlines":
      return confirmed(k.deadlines).map(
        (d) =>
          `${d.kind === "other" && d.label ? d.label : t.deadlineKinds[d.kind as keyof typeof t.deadlineKinds]} · ${d.due_date ? formatBriefDate(d.due_date) : t.guide.deadlines.noDate}`,
      );
    case "team": {
      const roles = fr.framingGuide.team.roles as Record<string, string>;
      const { roles: cards, others } = teamBoard(
        confirmed(k.framing.team),
        k.framing.needs,
        rolesContext(k),
      );
      return [
        ...cards.flatMap((card) =>
          card.member
            ? [`${roles[card.role]} : ${card.member.display_name}`]
            : card.holder
              ? [`${roles[card.role]} : ${card.holder}`]
              : [],
        ),
        ...others.map((m) =>
          m.role ? `${m.display_name} (${m.role})` : m.display_name,
        ),
        // Named once: already under « Direction créative » when they hold it.
        ...(cards.some((card) => card.holder)
          ? []
          : k.creatives.map(
              (c) => `${c.name} (${t.facts.creatives.toLowerCase()})`,
            )),
      ];
    }
    default:
      return [];
  }
}

const sourceOf = (
  provenance: FramingAssessment["dimensions"][number]["questions"][number]["provenance"],
): string | null => {
  if (!provenance) return null;
  if (provenance.kind === "record") return provenance.label;
  if (provenance.kind === "voice")
    return fr.framing.provenance.dictatedBy(provenance.author);
  return provenance.callTitle
    ? fr.framingGuide.brief.callTitle(provenance.callTitle)
    : fr.framingGuide.unknownCall;
};

export function buildBriefSnapshot(k: FramingKnowledge): BriefSnapshot {
  const assessment = assessFraming(k);
  const labels = fr.framingIntel.questions;
  const sources = new Set<string>();
  const dimensions = assessment.dimensions.map((d) => ({
    dimension: d.dimension,
    facts: d.facts,
    items: d.questions.map((q): SnapshotItem => {
      const known = q.status === "known";
      const source = known ? sourceOf(q.provenance) : null;
      if (source) sources.add(source);
      const lines = known ? linesOf(q.key, k) : [];
      return {
        key: q.key,
        label: labels[q.key].label,
        value: known ? q.display : null,
        lines,
        source,
      };
    }),
  }));
  for (const call of k.framing.reports)
    sources.add(fr.framingGuide.brief.callTitle(call.callTitle));
  return {
    schema: 1,
    project: {
      title: k.project.title,
      kind: projectKindLabel({
        type: k.project.type,
        musicFormat: k.project.musicFormat,
        contentFormatName: k.project.contentFormat?.name ?? null,
      }),
      artist: k.project.artistName,
    },
    dimensions,
    sources: [...sources],
  };
}

/** A stored version's content, read back defensively (it is JSON). */
export function snapshotOf(content: unknown): BriefSnapshot | null {
  const s = content as Partial<BriefSnapshot> | null;
  if (!s || s.schema !== 1 || !Array.isArray(s.dimensions)) return null;
  return s as BriefSnapshot;
}

export type BriefChange = {
  dimension: Dimension;
  label: string;
  before: string;
  after: string;
};

const wordsOf = (item: SnapshotItem | undefined) =>
  !item
    ? fr.framingIntel.notProvided
    : item.lines.length
      ? item.lines.join(" · ")
      : (item.value ?? fr.framingIntel.notProvided);

/** What changed from one version to the next, item by item. */
export function briefChanges(
  previous: BriefSnapshot,
  next: BriefSnapshot,
): BriefChange[] {
  return DIMENSIONS.flatMap((dimension) => {
    const before = previous.dimensions.find((d) => d.dimension === dimension);
    const after = next.dimensions.find((d) => d.dimension === dimension);
    return (after?.items ?? []).flatMap((item) => {
      const old = before?.items.find((i) => i.key === item.key);
      const a = wordsOf(old);
      const b = wordsOf(item);
      return a === b
        ? []
        : [{ dimension, label: item.label, before: a, after: b }];
    });
  });
}

/** Whether the live Cadrage still says what a version says. */
export function snapshotMatches(a: BriefSnapshot, b: BriefSnapshot): boolean {
  return briefChanges(a, b).length === 0;
}
