// Blockers and noted information of a step (docs/projet-complet/commons.md
// § 2.1 h, sub-lot C6): their shape as the step, the attention chips and the
// « Informations et décisions » dialog read them. Client-safe.

export const STEP_MODULES = [
  "framing",
  "strategy",
  "design",
  "production",
  "activations",
  "review",
  "master",
  "legal",
  "distribution",
] as const;
export type StepModule = (typeof STEP_MODULES)[number];

export const NOTE_SOURCES = [
  "call",
  "whatsapp",
  "email",
  "meeting",
  "other",
] as const;
export type NoteSource = (typeof NOTE_SOURCES)[number];

export const NOTE_STATUSES = [
  "information",
  "to_confirm",
  "pending_decision",
  "decided",
] as const;
export type NoteStatus = (typeof NOTE_STATUSES)[number];

/** Where a blocker or a note belongs: a step of a module, and the object
 * inside it when the step has several (a deliverable, an activation). */
export type StepRef = {
  projectId: string;
  module: StepModule;
  stepKey: string;
  subjectId?: string | null;
};

export type StepBlocker = {
  id: string;
  module: StepModule;
  stepKey: string;
  subjectId: string | null;
  description: string;
  unblocker: string;
  // The member who unblocks (lifts it), when it is one.
  unblockerPersonId: string | null;
  nextAction: string;
  reportedBy: string;
  reportedAt: string;
  lifted: { by: string; at: string; note: string } | null;
  // The viewer may lift it: the person who unblocks, or the owner.
  canLift: boolean;
};

export type StepNote = {
  id: string;
  module: StepModule;
  stepKey: string;
  subjectId: string | null;
  body: string;
  source: NoteSource;
  status: NoteStatus;
  group: string | null;
  authoritative: boolean;
  notedBy: string;
  notedAt: string;
  decided: { by: string; at: string } | null;
  discarded: boolean;
};

/** A step the « Étape concernée » of a note can name. */
export type StepChoice = { key: string; label: string };

export function sameStep(
  item: { module: StepModule; stepKey: string; subjectId: string | null },
  ref: StepRef,
): boolean {
  return (
    item.module === ref.module &&
    item.stepKey === ref.stepKey &&
    (ref.subjectId ?? null) === item.subjectId
  );
}

/** Groups of notes that contradict each other and where none is
 * authoritative yet: each is a blocker until the owner chooses. */
export function openContradictions(notes: StepNote[]): StepNote[][] {
  const groups = new Map<string, StepNote[]>();
  for (const note of notes) {
    if (!note.group) continue;
    groups.set(note.group, [...(groups.get(note.group) ?? []), note]);
  }
  return [...groups.values()].filter(
    (list) => list.length > 1 && !list.some((n) => n.authoritative),
  );
}

/** What the attention chips count (proto `strip`): open blockers (an open
 * contradiction counts as one), and the notes to confirm or decide. */
export function attentionOf(
  blockers: StepBlocker[],
  notes: StepNote[],
  extraBlockers = 0,
): { blockers: number; toConfirm: number } {
  const contradictions = openContradictions(notes);
  return {
    blockers:
      blockers.filter((b) => !b.lifted).length +
      contradictions.length +
      extraBlockers,
    toConfirm: notes.filter(
      (n) =>
        !n.discarded &&
        !n.group &&
        (n.status === "to_confirm" || n.status === "pending_decision"),
    ).length,
  };
}

/** The value of a step in the « Étape concernée » list. */
export function stepChoiceKey(item: {
  module: StepModule;
  stepKey: string;
  subjectId?: string | null;
}): string {
  return `${item.module}|${item.stepKey}|${item.subjectId ?? ""}`;
}

/** Back from `stepChoiceKey` to where a note belongs. */
export function stepOfChoice(projectId: string, key: string): StepRef | null {
  const [module, stepKey, subjectId] = key.split("|");
  if (!(STEP_MODULES as readonly string[]).includes(module) || !stepKey)
    return null;
  return {
    projectId,
    module: module as StepModule,
    stepKey,
    subjectId: subjectId || null,
  };
}
