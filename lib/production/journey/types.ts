// The journey of one deliverable's production (docs/PRODUCTION-METIER.md § 0
// and § 10): its steps, their state, who acts now. Computed by code from what
// people recorded, never stored. Client-safe.

import type {
  DirectionStatus,
  OrganizationKind,
} from "@/lib/production/organization";
import type { ProductionPhase } from "@/lib/production/phase";

export const STEP_KEYS = [
  "organisation",
  "call",
  "quote",
  "direction",
  "follow-up",
  "gear",
  "locations",
  "call-sheet",
  "readiness",
  "shoot",
  "post",
  "delivery",
] as const;
export type StepKey = (typeof STEP_KEYS)[number];
export const isStepKey = (v: string): v is StepKey =>
  (STEP_KEYS as readonly string[]).includes(v);

export type StepStatus = "done" | "current" | "blocked" | "upcoming";

/** Someone who holds a role: a member of PDS, or a contact through a link. */
export type JourneyPerson = { name: string; viewer: boolean; viaLink: boolean };

export type JourneyActor = JourneyPerson & { todo: string };

export type JourneyStep = {
  key: StepKey;
  title: string;
  why: string;
  status: StepStatus;
  owner: { name: string; role: string } | null;
  validator: { name: string; role: string } | null;
  prereq: StepKey[];
  next: StepKey[];
  actor: JourneyActor | null;
  summary: string | null;
};

export type QuoteStatus = "deposited" | "submitted" | "approved" | "rejected";

export type JourneyInput = {
  kind: OrganizationKind | null;
  opened: boolean;
  owner: JourneyPerson;
  // The line producer, else the owner.
  producer: JourneyPerson;
  // « Chargé de production », or the owner's own role when none is named.
  producerRole: string;
  validator: JourneyPerson | null;
  company: JourneyPerson | null;
  director: JourneyPerson | null;
  dop: JourneyPerson | null;
  // Who decides on the director's proposal: the creative directors, else
  // the owner.
  creative: JourneyPerson;
  call: { count: number; reported: boolean; proposed: number; planned: number };
  quote: { status: QuoteStatus | null; approved: number };
  direction: { status: DirectionStatus; written: boolean };
  progress: number;
  gear: { lines: number; positions: number; filled: number };
  locations: {
    status: "to_find" | "to_verify" | "confirmed";
    candidates: number;
    name: string | null;
  };
  callSheet: { ready: boolean; published: number | null };
  readyAt: string | null;
  phase: ProductionPhase;
  closed: boolean;
  // During the shoot, the post and the delivery: who is expected, from the
  // detailed next action (lib/production/next).
  later: JourneyActor | null;
};
