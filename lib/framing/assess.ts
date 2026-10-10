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
import { teamBoard } from "@/lib/framing/team-board";
import { fr } from "@/lib/i18n/fr";

export type QuestionStatus = "known" | "to_confirm" | "missing";

export type Answer =
  | { kind: "text"; text: string }
  | { kind: "date"; date: string }
  | { kind: "money"; cents: number }
  | { kind: "none" }
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
  if (value && typeof value === "object" && "none" in value) {
    return (value as { none: unknown }).none === true ? { kind: "none" } : null;
  }
  const kind = QUESTIONS[key].kind;
  if (kind === "date")
    return isIsoDate(value) ? { kind: "date", date: value } : null;
  if (kind === "money")
    return typeof value === "number" && Number.isInteger(value) && value >= 0
      ? { kind: "money", cents: value }
      : null;
  if (kind === "text")
    return typeof value === "string" && value.trim() !== ""
      ? { kind: "text", text: value }
      : null;
  return null;
}

export function displayOf(key: QuestionKey, answer: Answer): string {
  const t = fr.framingIntel;
  switch (answer.kind) {
    case "none":
      return (t.questions[key] as { none?: string }).none ?? t.none;
    case "text":
      return answer.text;
    case "date":
      return formatBriefDate(answer.date);
    case "money":
      return formatEuros(answer.cents);
    case "lines":
      return String(answer.count);
  }
}

type Party = { name: string; roles: string[] };

/**
 * Everyone outside PDS the project involves, decided by code: the titles'
 * credits, the team held by a contact or a name (never a member of the
 * app), and the intervenants the Juridique added. One line per name, its
 * roles merged (« Hugo Vasquez (direction créative, réalisation du clip) »).
 */
export function projectParties(k: FramingKnowledge): Party[] {
  const t = fr.framingIntel.records;
  const lower = (label: string) => label.toLowerCase();
  const creditRole = (role: string) =>
    role === "performer"
      ? t.performer
      : role === "featuring"
        ? t.featuring
        : lower(
            (fr.masterPage.credits.roles as Record<string, string>)[role] ??
              role,
          );
  const teamRoles = fr.framingGuide.team.roles as Record<string, string>;
  const roles = new Map<string, { name: string; roles: Set<string> }>();
  const add = (name: string, role: string | null) => {
    const key = name.trim().toLowerCase();
    if (!key) return;
    const entry = roles.get(key) ?? { name: name.trim(), roles: new Set() };
    if (role?.trim()) entry.roles.add(role.trim());
    roles.set(key, entry);
  };
  for (const c of k.credits) add(c.name, creditRole(c.role));
  for (const m of k.framing.team) {
    if (m.person_id || m.review_status !== "confirmed") continue;
    const role = m.role_key ? teamRoles[m.role_key] : m.role;
    add(m.display_name, role ? lower(role) : null);
  }
  for (const c of k.legalContacts)
    add(
      c.name,
      lower((fr.legalForms.roles as Record<string, string>)[c.role] ?? c.role),
    );
  return [...roles.values()].map((p) => ({
    name: p.name,
    roles: [...p.roles],
  }));
}

const partiesSource = (k: FramingKnowledge) => {
  const s = fr.framingIntel.sources;
  const team = k.framing.team.some(
    (m) => !m.person_id && m.review_status === "confirmed",
  );
  return [
    k.credits.length > 0 && s.credits,
    team && s.team,
    k.legalContacts.length > 0 && s.legal,
  ]
    .filter(Boolean)
    .join(" · ");
};

type Record_ = { answer: Answer; label: string } | null;

/** What the project already records for a question, if anything. */
function recordOf(key: QuestionKey, k: FramingKnowledge): Record_ {
  const t = fr.framingIntel;
  const s = t.sources;
  const text = (value: string, label: string): Record_ =>
    value.trim() ? { answer: { kind: "text", text: value }, label } : null;
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
                ? fr.catalog.audioStates[title.audioState]
                : t.records.noAudioState,
            ),
          )
          .join(" · "),
        s.catalog,
      );
    case "existing_elements":
      return k.files.length
        ? text(
            t.records.files(
              k.files.length,
              k.files.slice(0, 5).map((f) => f.name),
            ),
            s.files,
          )
        : null;
    case "decisions_made":
      return text(k.decisions.map((d) => d.what).join(" ; "), s.decisions);
    case "work_started": {
      const done = k.framing.tasks.filter(
        (task) => task.status === "done",
      ).length;
      const open = k.framing.tasks.length - done;
      return text(
        [
          t.records.tasks(done, open),
          k.masterBriefStarted && t.records.masterBrief,
          k.legalIntakeStarted && t.records.legalIntake,
        ]
          .filter(Boolean)
          .join(" · "),
        s.work,
      );
    }
    case "legal_parties":
      return text(
        t.records.parties(
          projectParties(k).map((p) => t.records.party(p.name, p.roles)),
        ),
        partiesSource(k),
      );
    case "legal_needs": {
      // One agreement per party outside PDS: which contract each one
      // takes is the Juridique's mapping, not the Cadrage's.
      const parties = projectParties(k);
      return parties.length
        ? text(
            t.records.needs(
              parties.map((p) => t.records.party(p.name, p.roles)),
            ),
            t.questions.legal_parties.label,
          )
        : null;
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
  if (marker?.kind === "none")
    return { status: "known", answer: marker, proposed: false };
  return { status: "missing", answer: null, proposed: false };
}

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
  return row.value !== record.answer.text;
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
      default:
        return linesState(key, [], marker);
    }
  })();
  return {
    ...base,
    ...lines,
    display:
      lines.answer?.kind === "none" ? displayOf(key, lines.answer) : null,
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
    case "timing":
      return p.dueDate
        ? [{ label: t.dueDate, value: formatBriefDate(p.dueDate) }]
        : [];
    case "budget":
      return p.budgetCents !== null
        ? [{ label: t.envelope, value: formatEuros(p.budgetCents) }]
        : [];
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
    ready: blocking.length === 0,
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
