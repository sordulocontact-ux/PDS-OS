// The journey of one deliverable's production (docs/PRODUCTION-METIER.md § 0
// and § 10, proto « Projet complet » production.md § 1): its steps, their
// state, who acts now. Computed by code from what people recorded, never
// stored. Client-safe.

import type {
  JourneyActor,
  JourneyPerson,
  JourneyStep as GenericStep,
} from "@/lib/ui/journey";
import type {
  DirectionStatus,
  OrganizationKind,
} from "@/lib/production/organization";
import type { ProductionPhase } from "@/lib/production/phase";
import type { ProductionMode } from "@/lib/production/sheet";
import type { VersionStatus } from "@/lib/production/post/rules";
import type { ProductionTrack } from "@/lib/production/track";

export const STEP_KEYS = [
  "organisation",
  "call",
  "quote",
  "direction",
  "follow-up",
  "control",
  "gear",
  "locations",
  "call-sheet",
  "readiness",
  "shoot",
  "rushes",
  "post",
  "delivery",
] as const;
export type StepKey = (typeof STEP_KEYS)[number];
export const isStepKey = (v: string): v is StepKey =>
  (STEP_KEYS as readonly string[]).includes(v);

export type { JourneyActor, JourneyPerson } from "@/lib/ui/journey";

/** The generic journey step, narrowed to Production's step keys. */
export type JourneyStep = Omit<GenericStep, "key" | "prereq" | "next"> & {
  key: StepKey;
  prereq: StepKey[];
  next: StepKey[];
};

export type QuoteStatus =
  "deposited" | "submitted" | "approved" | "rejected" | "changes" | "replaced";

export type JourneyInput = {
  projectId: string;
  deliverableId: string;
  kind: OrganizationKind | null;
  // The shoot's journey, or a light one (a cover, teasers drawn from the
  // clip, PR-13), and what a light journey reads.
  track: ProductionTrack;
  light: {
    latest: {
      number: number;
      status: VersionStatus;
      intApproved: boolean;
      ext: "none" | "pending" | "approved" | "changes";
    } | null;
    finalUrl: string | null;
    approved: number | null;
    approvedAt: string | null;
    checkedAt: string | null;
    deliveredAt: string | null;
    // Teasers drawn from the clip: « Montage du clip validé ».
    gate: { clip: string; done: boolean } | null;
  };
  // How the preproduction is organised: with PO, a call, an import.
  mode: ProductionMode;
  opened: boolean;
  owner: JourneyPerson;
  // The line producer, else the owner.
  producer: JourneyPerson;
  validator: JourneyPerson | null;
  company: JourneyPerson | null;
  director: JourneyPerson | null;
  dop: JourneyPerson | null;
  // The creative side (responsable créatif, validation créative interne):
  // the project's creative directors, else the owner.
  creative: JourneyPerson;
  call: {
    count: number;
    // The first production call's day (ISO), once one is held.
    heldOn: string | null;
    reported: boolean;
    proposed: number;
    confirmed: number;
  };
  // The latest version of the quote and the active reference.
  quote: {
    status: QuoteStatus | null;
    number: number | null;
    active: { number: number; amountCents: number } | null;
    revision: boolean;
  };
  // Directors proposed by the company, none retained yet.
  directorProposals: number;
  direction: { status: DirectionStatus; written: boolean };
  // The proposal in versions (external, PR-11), and the external creative
  // validation when « Qui fait quoi » names one.
  proposal: {
    latest: number | null;
    retained: number | null;
    depositOpen: boolean;
    waitsInt: boolean;
    waitsExt: boolean;
    rework: boolean;
  };
  creativeExt: JourneyPerson | null;
  // The preproduction checklist (external): tasks, done, held by the viewer.
  checklist: { total: number; done: number; companyOpen: number };
  gear: { lines: number; positions: number; filled: number };
  locations: {
    status: "to_find" | "to_verify" | "confirmed";
    candidates: number;
    name: string | null;
  };
  callSheet: { ready: boolean; published: number | null };
  readyAt: string | null;
  // A derogation before the shoot waiting for the direction (MKT-PROD-002).
  readyRequested: boolean;
  // The preparation reopened by a change after it (MKT-PROD-001).
  readyReopened: boolean;
  shotAt: string | null;
  rushes: { linked: boolean; received: boolean; backup: boolean };
  phase: ProductionPhase;
  closed: boolean;
  // Steps with an open blocker (« Signaler un blocage »).
  blockedSteps: readonly string[];
  // Steps to review after a change elsewhere (a place replaced).
  reworkSteps: readonly string[];
  // During the shoot, the post and the delivery: who is expected, from the
  // detailed next action (lib/production/next).
  later: JourneyActor | null;
};
