// The one next action of a deliverable's production (PROD-001, PROD-007):
// what to do now, why, who is expected, what is still missing and where it
// opens. Computed by code from what people recorded (CLAUDE.md, rule 6).
// Client-safe, types only.

import type { NextCardKind } from "@/components/ui/next-card";
import type {
  ChecklistSummary,
  Decision,
} from "@/lib/production/delivery/rules";
import type { ProductionPhase } from "@/lib/production/phase";
import type { VersionStatus } from "@/lib/production/post/rules";
import type { CheckKey } from "@/lib/production/preprod/types";
import type { CheckState } from "@/lib/production/preprod/readiness";
import type { ScheduleStep } from "@/lib/production/preprod/schedule";
import type { PostBlocker } from "@/lib/production/shoot/blockers";
import type { ShootState } from "@/lib/production/shoot/rules";

export type NextRole = "owner" | "director" | "reviewer" | "provider";

/** Who is expected: a name when one is known, and the role it holds. */
export type NextWho = { name: string | null; role: NextRole };

export type NextLink = { label: string; href: string; place: string };

export type ProductionNext = {
  kind: NextCardKind;
  title: string;
  why: string;
  // Null when nobody in particular is expected (finished, locked).
  who: NextWho | null;
  // The viewer is the one expected: « C'est à vous ».
  viewerIsWho: boolean;
  missing: string[];
  link: NextLink | null;
  // What was just finished, when the phase says it (PROD-007's recap).
  done: string | null;
  // Its due date, read in the backward schedule (ISO date), if any.
  due: string | null;
};

export type NextPerson = { name: string | null; isViewer: boolean };

/** What each phase needs to know, read only for the phase reached. */
export type NextInput = {
  projectId: string;
  // The backward schedule's dates (lib/production/preprod/schedule.ts).
  due: Partial<Record<ScheduleStep, string>>;
  deliverableId: string;
  phase: ProductionPhase;
  stageState: string;
  hasSource: boolean;
  canOpen: boolean;
  owner: NextPerson;
  sheet: {
    director: (NextPerson & { isMember: boolean }) | null;
    briefWritten: boolean;
  } | null;
  preprod: {
    hasTechnicalCall: boolean;
    equipmentCount: number;
    staffing: { positions: number; filled: number; toConfirm: number };
    // In the readiness order; `workDone` = what the check rests on exists.
    checks: { key: CheckKey; state: CheckState; workDone: boolean }[];
  } | null;
  shoot: {
    state: ShootState;
    postBlockers: PostBlocker[];
  } | null;
  post: {
    viewerReviews: boolean;
    // Steps in order, with their label and holder's name.
    steps: { label: string; holder: string | null }[];
    // The one who makes the versions: the editing step's holder, if any.
    maker: string | null;
    // A Réseau provider who has no private link yet (PROD-026).
    makerNeedsLink: boolean;
    // Newest first.
    versions: {
      number: number;
      status: VersionStatus;
      // Its correction request is still a draft (not transmitted).
      requestDraft: boolean;
    }[];
    pendingCorrections: number;
  } | null;
  delivery: {
    decisions: { creative: Decision; technical: Decision; delivery: Decision };
    summary: ChecklistSummary;
    approvedVersion: number | null;
    handoffStale: boolean;
  } | null;
};
