// The Brief Mix/Master of a project (master_briefs, docs/ARCHITECTURE.md
// § 8 septies, lot 3): values and types shared by the page and its form.
// Client-safe; the lists mirror the database checks.

import type { BudgetStatus } from "@/lib/budget/types";
import type { CallStatus } from "@/lib/calls/constants";
import type { AgendaItem } from "@/lib/calls/first-call-agenda";
import type { MasterFact, NetworkEngineer } from "@/lib/master-workflow/types";

/** What the engineers deliver (ticket § 3): chosen, never all imposed. */
export const BRIEF_DELIVERABLES = [
  "mix_final",
  "master_final",
  "instrumental",
  "acapella",
  "clean",
  "radio_edit",
  "live",
  "tv_mix",
  "stems",
] as const;
export type BriefDeliverable = (typeof BRIEF_DELIVERABLES)[number];

export const DEFAULT_DELIVERABLES: BriefDeliverable[] = [
  "mix_final",
  "master_final",
];

export function briefDeliverablesOf(values: readonly string[]) {
  return values.filter((value): value is BriefDeliverable =>
    (BRIEF_DELIVERABLES as readonly string[]).includes(value),
  );
}

/** The four dates of the calendar, earliest first. */
export const BRIEF_DATES = [
  "mixV1Due",
  "mixFinalDue",
  "masteringDue",
  "masterFinalDue",
] as const;
export type BriefDate = (typeof BRIEF_DATES)[number];

export type MasterBrief = {
  mixContactId: string | null;
  masteringSameEngineer: boolean;
  masteringContactId: string | null;
  mixRateCents: number | null;
  masteringRateCents: number | null;
  revisions: number | null;
  validatorPersonId: string | null;
  references: string | null;
  direction: string | null;
  constraints: string | null;
  deliverables: BriefDeliverable[];
  dates: Record<BriefDate, string | null>;
};

/** A person who may validate the versions: the owner, a creative director. */
export type BriefPerson = { personId: string; name: string };

/** The Budget line standing for a role of the brief. */
export type BriefBudgetLine = {
  role: "mix" | "mastering";
  amountCents: number;
  status: BudgetStatus;
};

/** A call held to fill the brief, newest first. */
export type BriefExchange = {
  callId: string;
  title: string;
  occurredAt: string;
  status: CallStatus;
  href: string;
  // Transcribed: what was said can be proposed for the brief.
  canPropose: boolean;
};

/** Everything the Brief page shows, read in one round. */
export type BriefView = {
  projectId: string;
  brief: MasterBrief;
  // Last saved, by whom; null while the brief has never been saved (the
  // form then starts from what the project already knows).
  savedAt: string | null;
  savedBy: string | null;
  // The mix's source of each title (État du master's facts, actions kept).
  sources: MasterFact[];
  // Every title already has its master final: nothing to mix nor master.
  allFinal: boolean;
  sourcesFailed: boolean;
  engineers: NetworkEngineer[];
  validators: BriefPerson[];
  exchanges: BriefExchange[];
  budget: BriefBudgetLine[];
  // The agenda a new exchange would get (what the brief still lacks).
  nextAgenda: AgendaItem[];
  // The project's owner: the only one who writes the brief.
  canEdit: boolean;
  // The owner and the direction: the rates and the budget section are
  // theirs (UX test of 09/10/2026); for anyone else the rates are null.
  canSeeBudget: boolean;
  // manage_network: add an engineer to the Réseau from the form.
  canAddContact: boolean;
  organizationId: string | null;
};
