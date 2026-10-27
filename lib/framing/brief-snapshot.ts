// The Brief de cadrage as one frozen object (ticket § 7): the six
// dimensions in words, written by code from what was confirmed, plus its
// sources. Stored as each version's content (framing_briefs.content), so
// what the validator reads is exactly what was sent; two versions compare
// key by key for the history of changes. Client-safe.

import { formatEuros } from "@/lib/budget/types";
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
import { legalPartyBoard, partyLineText } from "@/lib/framing/legal-parties";
import { teamBoard } from "@/lib/framing/team-board";
import { framing } from "@/lib/i18n/fr/framing";
import { framingGuide } from "@/lib/i18n/fr/framing-guide";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { projectKindLabel } from "@/lib/projects/labels";
import { normalizeSearch } from "@/lib/utils/search";

const fr = { framing, framingGuide, framingIntel };

export type SnapshotItem = {
  key: string;
  label: string;
  // The answer in words; null = « Non renseigné ».
  value: string | null;
  // A list question: one entry per line.
  lines: string[];
  source: string | null;
  // The project sheet said otherwise: « Modifié · initial : … » (PROJ-BUG-04).
  initial?: string | null;
};

/** What to act on, without reading the whole Cadrage (PROJ-BUG-04). */
export type BriefSummary = {
  decisions: string[];
  open: string[];
  risks: string[];
  prerequisites: string[];
  owners: string[];
};

export type BriefSnapshot = {
  // 2 (11/10/2026): summary, initial values, qualified legal parties.
  schema: 1 | 2;
  project: { title: string; kind: string; artist: string };
  dimensions: Array<{
    dimension: Dimension;
    items: SnapshotItem[];
    facts: Array<{ label: string; value: string }>;
  }>;
  sources: string[];
  summary?: BriefSummary;
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
      // One line per need, even typed twice (PROJ-BUG-03).
      return [
        ...new Map(
          confirmed(k.framing.needs).map((n) => [
            normalizeSearch(n.label.trim()),
            n.label,
          ]),
        ).values(),
      ];
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
          `${d.kind === "other" && d.label ? d.label : t.deadlineKinds[d.kind as keyof typeof t.deadlineKinds]} · ${d.due_date ? formatBriefDate(d.due_date) : t.guide.deadlines.noDate}${d.confidence === "estimated" ? ` · ${t.guide.deadlines.confidences.estimated.toLowerCase()}` : ""}`,
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
    case "parties": {
      // Each party with what a person decided (PROJ-BUG-03); a role nobody
      // holds is said once, never turned into a party.
      const board = legalPartyBoard(k);
      const nameOf = (personId: string) =>
        k.framing.members.find((m) => m.personId === personId)?.name ?? null;
      return [
        ...board.lines.map((line) => partyLineText(line, nameOf)),
        ...(board.unassignedRoles.length
          ? [t.parties.unassigned(board.unassignedRoles)]
          : []),
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
  if (provenance.kind === "generated")
    return fr.framing.provenance.generatedFrom(provenance.label);
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
        initial: known ? initialOf(q, k) : null,
      };
    }),
  }));
  for (const call of k.framing.reports)
    sources.add(fr.framingGuide.brief.callTitle(call.callTitle));
  return {
    schema: 2,
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
    summary: summaryOf(k, assessment),
  };
}

/** The project sheet's value, when the confirmed answer differs from it. */
function initialOf(
  q: FramingAssessment["dimensions"][number]["questions"][number],
  k: FramingKnowledge,
): string | null {
  const t = fr.framingIntel.facts;
  if (q.key === "target_date" && q.answer?.kind === "date")
    return k.project.dueDate && k.project.dueDate !== q.answer.date
      ? t.initial(formatBriefDate(k.project.dueDate))
      : null;
  if (q.key === "budget_envelope" && q.answer?.kind === "money")
    return k.project.budgetCents !== null &&
      k.project.budgetCents !== q.answer.cents
      ? t.initial(formatEuros(k.project.budgetCents))
      : null;
  return null;
}

/**
 * The Brief around what to act on, written by code from the answers only:
 * decisions, open points, risks, prerequisites, who is responsible. Nothing
 * is added that the Cadrage does not say.
 */
function summaryOf(
  k: FramingKnowledge,
  assessment: FramingAssessment,
): BriefSummary {
  const t = fr.framingIntel.summary;
  const labels = fr.framingIntel.questions;
  const all = assessment.dimensions.flatMap((d) => d.questions);
  const said = (key: keyof typeof labels) => {
    const q = all.find((x) => x.key === key);
    return q?.status === "known" && q.answer?.kind === "text"
      ? [q.answer.text]
      : [];
  };
  const parties = legalPartyBoard(k);
  const nameOf = (personId: string) =>
    k.framing.members.find((m) => m.personId === personId)?.name ?? null;
  const statuses = fr.framingIntel.parties.statuses;
  return {
    decisions: [...said("main_priority"), ...said("decisions_made")],
    open: [
      ...assessment.optionalEmpty.map((q) =>
        t.notProvided(labels[q.key].label),
      ),
      ...all
        .filter((q) => q.answer?.kind === "later")
        .map((q) => `${labels[q.key].label} : ${q.display ?? ""}`),
      ...k.framing.openPoints
        .filter((p) => p.status === "open")
        .map((p) => t.openPoint(p.question)),
      ...parties.lines
        .filter((l) => l.decision?.document_status === "to_verify")
        .map((l) =>
          t.partyAction(
            statuses.to_verify,
            l.name,
            l.decision?.owner_person_id
              ? nameOf(l.decision.owner_person_id)
              : null,
          ),
        ),
    ],
    risks: [
      ...linesOf("legal_blockers", k).map(t.blocker),
      ...linesOf("constraints", k).map(t.constraint),
    ],
    prerequisites: [
      ...said("prerequisites"),
      ...linesOf("deadlines", k).map(t.deadline),
      ...parties.lines
        .filter((l) => l.decision?.document_status === "to_prepare")
        .map((l) =>
          t.partyAction(
            statuses.to_prepare,
            l.name,
            l.decision?.owner_person_id
              ? nameOf(l.decision.owner_person_id)
              : null,
          ),
        ),
    ],
    owners: [
      ...(k.project.ownerName ? [t.owner(k.project.ownerName)] : []),
      ...k.framing.validators.map((v) => t.validator(v.name)),
    ],
  };
}

/** A stored version's content, read back defensively (it is JSON). */
export function snapshotOf(content: unknown): BriefSnapshot | null {
  const s = content as Partial<BriefSnapshot> | null;
  if (!s || (s.schema !== 1 && s.schema !== 2) || !Array.isArray(s.dimensions))
    return null;
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

/** The summary's non-empty groups, in reading order, with their titles. */
export function summaryGroups(
  snapshot: BriefSnapshot,
): Array<[string, string[]]> {
  const t = fr.framingIntel.summary;
  const s = snapshot.summary;
  if (!s) return [];
  return (
    [
      [t.decisions, s.decisions],
      [t.open, s.open],
      [t.risks, s.risks],
      [t.prerequisites, s.prerequisites],
      [t.owners, s.owners],
    ] as Array<[string, string[]]>
  ).filter(([, lines]) => lines.length > 0);
}
