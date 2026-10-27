// The analysis PO shows before asking anything (ticket § 2): each question
// of the six dimensions classed known / to confirm / missing, with what is
// known and where it comes from. Decided by code from the rows read, never
// by the model (rule 6): « ne jamais redemander inutilement une information
// déjà connue ». Client-safe (types only from the server loader).

import { formatEuros } from "@/lib/budget/types";
import type { Provenance } from "@/lib/framing/brief";
import {
  DIMENSIONS,
  QUESTIONS,
  questionsOf,
  type Dimension,
  type QuestionKey,
} from "@/lib/framing/dimensions";
import type { FramingKnowledge } from "@/lib/framing/knowledge";
import {
  ITEM_STATES,
  type AnswerItem,
  type Measure,
} from "@/lib/framing/dimensions";
import {
  framingConflicts,
  type FramingConflict,
} from "@/lib/framing/conflicts";
import { legalPartyBoard } from "@/lib/framing/legal-parties";
import { teamBoard } from "@/lib/framing/team-board";
import { budget } from "@/lib/i18n/fr/budget";
import { contracts } from "@/lib/i18n/fr/contracts";
import { framingGuide } from "@/lib/i18n/fr/framing-guide";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";

const fr = { framingGuide, framingIntel, budget, contracts };

export type QuestionStatus = "known" | "to_confirm" | "missing";

export type Answer =
  // `items` / `measure`: the structured form of a text answer (PROJ-UX-04/05).
  | { kind: "text"; text: string; items?: AnswerItem[]; measure?: Measure }
  | { kind: "date"; date: string }
  // `certainty`: the envelope is confirmed or only estimated (PROJ-UX-05).
  | { kind: "money"; cents: number; certainty?: "confirmed" | "estimated" }
  | { kind: "none" }
  // « Non applicable » with its reason, « À définir plus tard » with its
  // follow-up task (PROJ-UX-04): answered, never left silent.
  | { kind: "na"; reason: string }
  | { kind: "later"; due: string; taskId: string | null }
  | { kind: "lines"; count: number };

export type QuestionState = {
  key: QuestionKey;
  dimension: Dimension;
  status: QuestionStatus;
  answer: Answer | null;
  // The answer in words, written by code.
  display: string | null;
  provenance: Provenance | null;
  // A value the project records elsewhere, offered for confirmation but
  // not stored yet (« Confirmer » writes it, read again by the server).
  fromRecord: boolean;
  // A stored proposal (a call, a dictation, PO's reading of the context).
  proposed: boolean;
  // A person set this question aside (« Écarter »): not offered again.
  dismissed: boolean;
  // Known: who confirmed (or wrote) the answer, and when (PROJ-BUG-02).
  confirmed?: { by: string | null; at: string | null };
};

export type DimensionState = {
  dimension: Dimension;
  questions: QuestionState[];
  counts: Record<QuestionStatus, number>;
  status: QuestionStatus;
  // What the project already knows around it (owner, validator…).
  facts: Array<{ label: string; value: string }>;
};

export type FramingAssessment = {
  dimensions: DimensionState[];
  counts: Record<QuestionStatus, number>;
  total: number;
  // The question to ask now: the first one not known, in order.
  next: QuestionState | null;
  // Answers that contradict each other or the records (PROJ-BUG-04).
  conflicts: FramingConflict[];
  // Every required question known and nothing left to confirm.
  ready: boolean;
  blocking: QuestionState[];
  optionalEmpty: QuestionState[];
};

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
export const formatBriefDate = (iso: string) =>
  dateFormat.format(new Date(`${iso}T00:00:00Z`));

const isIsoDate = (v: unknown): v is string =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** A stored Brief value, read by its question's kind. */
export function answerOf(key: QuestionKey, value: unknown): Answer | null {
  const o =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  if (o && "none" in o) return o.none === true ? { kind: "none" } : null;
  if (o?.na === true && typeof o.reason === "string")
    return { kind: "na", reason: o.reason };
  if (o?.later === true && isIsoDate(o.due))
    return {
      kind: "later",
      due: o.due,
      taskId: typeof o.taskId === "string" ? o.taskId : null,
    };
  const kind = QUESTIONS[key].kind;
  if (kind === "date")
    return isIsoDate(value) ? { kind: "date", date: value } : null;
  if (kind === "money") {
    const cents = o ? o.cents : value;
    if (typeof cents !== "number" || !Number.isInteger(cents) || cents < 0)
      return null;
    return o?.certainty === "estimated" || o?.certainty === "confirmed"
      ? { kind: "money", cents, certainty: o.certainty }
      : { kind: "money", cents };
  }
  if (kind === "text") {
    if (typeof value === "string")
      return value.trim() !== "" ? { kind: "text", text: value } : null;
    const items = itemsOf(o?.items);
    if (items?.length) return { kind: "text", text: itemsText(items), items };
    const measure = measureOf(o?.measure);
    if (measure) return { kind: "text", text: measureText(measure), measure };
  }
  return null;
}

function itemsOf(value: unknown): AnswerItem[] | null {
  if (!Array.isArray(value)) return null;
  return value.flatMap((item: unknown) => {
    const i = item as { label?: unknown; state?: unknown } | null;
    return typeof i?.label === "string" &&
      i.label.trim() &&
      (ITEM_STATES as readonly unknown[]).includes(i.state)
      ? [{ label: i.label.trim(), state: i.state as AnswerItem["state"] }]
      : [];
  });
}

function measureOf(value: unknown): Measure | null {
  const m = value as Partial<Measure> | null;
  return m &&
    typeof m.metric === "string" &&
    m.metric.trim() &&
    typeof m.target === "number" &&
    Number.isFinite(m.target) &&
    typeof m.period === "string" &&
    m.period.trim()
    ? {
        metric: m.metric.trim(),
        target: m.target,
        period: m.period.trim(),
        source:
          typeof m.source === "string" && m.source.trim() ? m.source : null,
      }
    : null;
}

const number = new Intl.NumberFormat("fr-FR");

/** « Mix (en cours) · Pochette (terminé) ». */
export const itemsText = (items: AnswerItem[]) =>
  items
    .map(
      (i) =>
        `${i.label} (${fr.framingIntel.itemStates[i.state].toLowerCase()})`,
    )
    .join(" · ");

/** « 500 000 streams · premier mois · source : Spotify for Artists ». */
export const measureText = (m: Measure) =>
  fr.framingIntel.measure.text(
    number.format(m.target),
    m.metric,
    m.period,
    m.source,
  );

/** An answer as a Brief row stores it (field_values.value). */
export function storedValue(answer: Answer): unknown {
  switch (answer.kind) {
    case "text":
      return answer.items
        ? { items: answer.items }
        : answer.measure
          ? { measure: answer.measure }
          : answer.text;
    case "date":
      return answer.date;
    case "money":
      return answer.certainty
        ? { cents: answer.cents, certainty: answer.certainty }
        : answer.cents;
    case "na":
      return { na: true, reason: answer.reason };
    case "later":
      return { later: true, due: answer.due, taskId: answer.taskId };
    default:
      return { none: true };
  }
}

export function displayOf(key: QuestionKey, answer: Answer): string {
  const t = fr.framingIntel;
  switch (answer.kind) {
    case "none":
      return (t.questions[key] as { none?: string }).none ?? t.none;
    case "na":
      return t.answerStates.na(answer.reason);
    case "later":
      return t.answerStates.later(formatBriefDate(answer.due));
    case "text":
      return answer.text;
    case "date":
      return formatBriefDate(answer.date);
    case "money":
      return answer.certainty === "estimated"
        ? t.measure.estimated(formatEuros(answer.cents))
        : formatEuros(answer.cents);
    case "lines":
      return String(answer.count);
  }
}

type Record_ = { answer: Answer; label: string } | null;

/** What the project already records for a question, if anything. */
function recordOf(key: QuestionKey, k: FramingKnowledge): Record_ {
  const t = fr.framingIntel;
  const s = t.sources;
  const text = (value: string, label: string): Record_ =>
    value.trim() ? { answer: { kind: "text", text: value }, label } : null;
  const items = (list: AnswerItem[], label: string): Record_ =>
    list.length
      ? { answer: { kind: "text", text: itemsText(list), items: list }, label }
      : null;
  switch (key) {
    case "target_date":
      return k.project.dueDate
        ? {
            answer: { kind: "date", date: k.project.dueDate },
            label: s.projectSheet,
          }
        : null;
    case "budget_envelope":
      return k.project.budgetCents !== null
        ? {
            answer: { kind: "money", cents: k.project.budgetCents },
            label: s.projectSheet,
          }
        : null;
    case "commitments": {
      const engaged = k.budgetLines.filter(
        (l) => l.status === "committed" || l.status === "paid",
      );
      return text(
        engaged
          .map((l) =>
            t.records.commitment(
              l.label,
              formatEuros(l.amountCents),
              (fr.budget.statuses as Record<string, string>)[l.status] ??
                l.status,
            ),
          )
          .join(" ; "),
        s.budget,
      );
    }
    case "decision_makers": {
      if (!k.project.ownerName) return null;
      return text(
        t.records.decisionMakers(
          k.project.ownerName,
          k.framing.validators[0]?.name ?? null,
        ),
        s.team,
      );
    }
    case "missing_skills": {
      const roles = teamBoard(k.framing.team, k.framing.needs, rolesContext(k))
        .roles.filter((r) => !r.member && !r.holder)
        .map((r) => fr.framingGuide.team.roles[r.role]);
      return roles.length
        ? text(t.records.rolesToFind(roles), s.rolesToFind)
        : null;
    }
    case "current_state":
      return text(
        k.titles
          .map((title) =>
            t.records.titleState(
              title.title,
              title.audioState
                ? t.records.audioStates[title.audioState]
                : t.records.noAudioState,
            ),
          )
          .join(" · "),
        s.catalog,
      );
    case "existing_elements": {
      // What the project holds, each « existe » (PROJ-UX-05): read from the
      // files, confirmed by a person, never asked again from scratch.
      const files = k.files
        .slice(0, 10)
        .map((f): AnswerItem => ({ label: f.name, state: "exists" }));
      return items(
        k.files.length > files.length
          ? [
              ...files,
              {
                label: t.records.moreFiles(k.files.length - files.length),
                state: "exists",
              },
            ]
          : files,
        s.files,
      );
    }
    case "decisions_made":
      return text(k.decisions.map((d) => d.what).join(" ; "), s.decisions);
    case "work_started": {
      // From the Catalogue: each title's step, never « mix » alone — a mix
      // received is « en cours », only the final master is « terminé ».
      const steps = k.titles.flatMap((title): AnswerItem[] =>
        title.audioState
          ? [
              {
                label: t.records.titleState(
                  title.title,
                  t.records.audioStates[title.audioState],
                ),
                state:
                  title.audioState === "final_master" ? "done" : "in_progress",
              },
            ]
          : [],
      );
      const done = k.framing.tasks.filter(
        (task) => task.status === "done",
      ).length;
      const open = k.framing.tasks.length - done;
      return items(
        [
          ...steps,
          ...(k.framing.tasks.length
            ? [
                {
                  label: t.records.tasks(done, open),
                  state: open > 0 ? "in_progress" : "done",
                } as AnswerItem,
              ]
            : []),
          ...(k.masterBriefStarted
            ? [
                {
                  label: t.records.masterBrief,
                  state: "in_progress",
                } as AnswerItem,
              ]
            : []),
          ...(k.legalIntakeStarted
            ? [
                {
                  label: t.records.legalIntake,
                  state: "in_progress",
                } as AnswerItem,
              ]
            : []),
        ],
        s.work,
      );
    }
    case "legal_agreements":
      return text(
        k.contracts
          .map((c) =>
            t.records.contract(
              c.title,
              (fr.contracts.states as Record<string, string>)[c.status] ??
                c.status,
            ),
          )
          .join(" · "),
        s.contracts,
      );
    case "legal_secured":
      return text(
        t.records.secured(
          k.contracts.filter((c) => c.status === "signed").length,
          k.completeSplits,
          k.depositedDeclarations,
        ),
        s.legal,
      );
    default:
      return null;
  }
}

/** Whether the engineers' roles are offered (a music project with titles). */
export const rolesContext = (k: FramingKnowledge) => ({
  music: k.project.type === "music_release" && k.titles.length > 0,
  creatives: k.creatives,
});

/**
 * The legal parties (PROJ-BUG-03): known once a person has qualified every
 * one of them; to confirm while one is not; « Personne en dehors de PDS »
 * only stands while the records name nobody.
 */
function partiesState(
  k: FramingKnowledge,
  marker: Answer | null,
): Pick<QuestionState, "status" | "answer" | "proposed"> {
  const board = legalPartyBoard(k);
  const count = board.lines.length;
  if (count === 0)
    return isMarker(marker)
      ? { status: "known", answer: marker, proposed: false }
      : { status: "missing", answer: null, proposed: false };
  return {
    status: board.undecided > 0 ? "to_confirm" : "known",
    answer: { kind: "lines", count },
    proposed: false,
  };
}

type LineRow = { review_status: string };

function linesState(
  key: QuestionKey,
  rows: LineRow[],
  marker: Answer | null,
  extraKnown = 0,
): Pick<QuestionState, "status" | "answer" | "proposed"> {
  const live = rows.filter((r) => r.review_status !== "rejected");
  const proposed = live.some((r) => r.review_status === "proposed");
  if (proposed)
    return {
      status: "to_confirm",
      answer: { kind: "lines", count: live.length },
      proposed,
    };
  if (live.length + extraKnown > 0)
    return {
      status: "known",
      answer: { kind: "lines", count: live.length + extraKnown },
      proposed: false,
    };
  if (isMarker(marker))
    return { status: "known", answer: marker, proposed: false };
  return { status: "missing", answer: null, proposed: false };
}

/** « Rien à signaler », « Non applicable », « À définir plus tard ». */
const isMarker = (a: Answer | null): a is Answer =>
  a?.kind === "none" || a?.kind === "na" || a?.kind === "later";

/**
 * A value confirmed as the project recorded it (« Confirmer » on a record:
 * imported, with a source label and no quote) whose records have changed
 * since: offered again while the Cadrage is open (a team member added after
 * the parties were confirmed). A value written by a person never is.
 */
function outdated(
  row: FramingKnowledge["framing"]["briefRows"][number] | undefined,
  record: Record_,
  k: FramingKnowledge,
): boolean {
  const stage = k.framing.stage?.state ?? "not_started";
  if (stage !== "not_started" && stage !== "in_progress") return false;
  if (!row || !record || record.answer.kind !== "text") return false;
  if (row.source_type !== "import" || !row.source_label || row.source_quote)
    return false;
  // Compared as stored: a sentence, or items (PROJ-UX-05).
  return (
    JSON.stringify(row.value) !== JSON.stringify(storedValue(record.answer))
  );
}

function questionState(key: QuestionKey, k: FramingKnowledge): QuestionState {
  const def = QUESTIONS[key];
  const row = k.framing.briefRows.find((r) => r.field_key === key);
  const stored =
    row && row.status !== "rejected" ? answerOf(key, row.value) : null;
  const base = {
    key,
    dimension: def.dimension,
    fromRecord: false,
    dismissed: row?.status === "rejected",
    provenance: stored ? (row?.provenance ?? null) : null,
  };

  if (def.kind === "text" || def.kind === "date" || def.kind === "money") {
    const record = row?.status === "rejected" ? null : recordOf(key, k);
    if (stored && row?.status === "confirmed" && !outdated(row, record, k))
      return {
        ...base,
        status: "known",
        answer: stored,
        display: displayOf(key, stored),
        proposed: false,
        confirmed: { by: row.authorName ?? null, at: row.created_at },
      };
    if (stored && row?.status === "proposed")
      return {
        ...base,
        status: "to_confirm",
        answer: stored,
        display: displayOf(key, stored),
        proposed: true,
      };
    if (record)
      return {
        ...base,
        status: "to_confirm",
        answer: record.answer,
        display: displayOf(key, record.answer),
        provenance: { kind: "record", label: record.label, quote: null },
        fromRecord: true,
        proposed: false,
      };
    return {
      ...base,
      status: "missing",
      answer: null,
      display: null,
      proposed: false,
    };
  }

  const marker = stored;
  const lines = (() => {
    switch (def.kind) {
      case "needs":
        return linesState(key, k.framing.needs, marker);
      case "constraints":
        return linesState(
          key,
          k.framing.constraints.filter((c) => c.type !== "rights"),
          marker,
        );
      case "rights":
        return linesState(
          key,
          k.framing.constraints.filter((c) => c.type === "rights"),
          marker,
        );
      case "deadlines":
        return linesState(key, k.deadlines, marker);
      case "team":
        // The creative team is recorded on the project: known intervenants.
        return linesState(key, k.framing.team, marker, k.creatives.length);
      case "parties":
        return partiesState(k, marker);
      default:
        return linesState(key, [], marker);
    }
  })();
  return {
    ...base,
    ...lines,
    display:
      lines.answer && isMarker(lines.answer)
        ? displayOf(key, lines.answer)
        : null,
    provenance: null,
  };
}

function factsOf(dimension: Dimension, k: FramingKnowledge) {
  const t = fr.framingIntel.facts;
  const p = k.project;
  switch (dimension) {
    case "objective":
      return p.masters.length
        ? [
            {
              label: t.titles,
              value: p.masters.map((m) => m.title).join(" · "),
            },
          ]
        : [];
    // The date and envelope of the project sheet are not repeated beside the
    // confirmed answer: one current value per field (PROJ-BUG-04); when they
    // differ, the Brief says « initial » next to the answer.
    case "timing":
    case "budget":
      return [];
    case "team":
      return [
        { label: t.owner, value: p.ownerName ?? t.none },
        {
          label: t.validator,
          value: k.framing.validators.map((v) => v.name).join(", ") || t.none,
        },
        ...(k.creatives.length
          ? [
              {
                label: t.creatives,
                value: k.creatives.map((c) => c.name).join(", "),
              },
            ]
          : []),
      ];
    case "start":
      return [];
    case "legal":
      return [
        {
          label: t.contracts,
          value: k.contracts.length ? String(k.contracts.length) : t.none,
        },
      ];
  }
}

const statusOf = (counts: Record<QuestionStatus, number>): QuestionStatus =>
  counts.missing > 0
    ? "missing"
    : counts.to_confirm > 0
      ? "to_confirm"
      : "known";

const countsOf = (questions: QuestionState[]) => ({
  known: questions.filter((q) => q.status === "known").length,
  to_confirm: questions.filter((q) => q.status === "to_confirm").length,
  missing: questions.filter((q) => q.status === "missing").length,
});

export function assessFraming(k: FramingKnowledge): FramingAssessment {
  const dimensions = DIMENSIONS.map((dimension): DimensionState => {
    const questions = questionsOf(dimension).map((key) =>
      questionState(key, k),
    );
    const counts = countsOf(questions);
    return {
      dimension,
      questions,
      counts,
      status: statusOf(counts),
      facts: factsOf(dimension, k),
    };
  });
  const all = dimensions.flatMap((d) => d.questions);
  const conflicts = framingConflicts(k, all, legalPartyBoard(k));
  const blocking = all.filter(
    (q) =>
      q.status === "to_confirm" ||
      (q.status === "missing" && QUESTIONS[q.key].required),
  );
  return {
    dimensions,
    counts: countsOf(all),
    total: all.length,
    next:
      all.find(
        (q) =>
          q.status !== "known" && !(q.dismissed && !QUESTIONS[q.key].required),
      ) ?? null,
    // Never over a contradiction: a person resolves it first (PROJ-BUG-04).
    ready: blocking.length === 0 && conflicts.length === 0,
    conflicts,
    blocking,
    // Optional questions left empty (or set aside): they never block the
    // Brief, but « complet » would be false while they are there.
    optionalEmpty: all.filter(
      (q) => q.status === "missing" && !QUESTIONS[q.key].required,
    ),
  };
}

/** The question after `key` that still needs someone, in order. */
export function nextAfter(
  assessment: FramingAssessment,
  key: QuestionKey,
): QuestionState | null {
  const all = assessment.dimensions.flatMap((d) => d.questions);
  const from = all.findIndex((q) => q.key === key);
  const open = (q: QuestionState) =>
    q.status !== "known" && !(q.dismissed && !QUESTIONS[q.key].required);
  return (
    all.slice(from + 1).find(open) ?? all.slice(0, from).find(open) ?? null
  );
}

export function findQuestion(assessment: FramingAssessment, key: QuestionKey) {
  return assessment.dimensions
    .flatMap((d) => d.questions)
    .find((q) => q.key === key)!;
}
