"use server";

import { z } from "zod";

import {
  decideDistributionClosure,
  decideReserveLift,
  proposeDistributionClosure,
  reopenDistributionClosure,
  requestReserveLift,
} from "@/lib/distribution/closure-actions";
import type {
  ClosureKind,
  Criticality,
  ReasonKind,
  ReserveCause,
} from "@/lib/distribution/closure";
import { fr } from "@/lib/i18n/fr";
import { withOutcome } from "@/lib/journey/outcome";
import type { WriteResult } from "@/lib/utils/write-result";

const id = z.uuid();
const invalid = {
  ok: false as const,
  error: fr.distribution.closure.errors.invalid,
};

// The closure's gestures, each saying what follows (VISION-UX rule 7).

export async function proposeClosure(input: {
  projectId: string;
  releaseId?: string | null;
  kind: ClosureKind;
  arbitration: string;
  acknowledged: boolean;
  reasonKind: ReasonKind | null;
  reserves: Array<{
    cause: ReserveCause;
    ownerPersonId: string;
    dueOn: string;
    expectedProof: string;
    criticality: Criticality;
  }>;
  done: string;
}): Promise<WriteResult> {
  if (!id.safeParse(input.projectId).success) return invalid;
  return withOutcome(input.projectId, ["distribution"], input.done, () =>
    proposeDistributionClosure(input),
  );
}

export async function decideClosure(input: {
  projectId: string;
  releaseId?: string | null;
  closureId: string;
  approve: boolean;
  note: string;
  done: string;
}): Promise<WriteResult> {
  if (!id.safeParse(input.projectId).success) return invalid;
  return withOutcome(input.projectId, ["distribution"], input.done, () =>
    decideDistributionClosure(input),
  );
}

export async function reopenClosure(input: {
  projectId: string;
  releaseId?: string | null;
  note: string;
}): Promise<WriteResult> {
  if (!id.safeParse(input.projectId).success) return invalid;
  return withOutcome(
    input.projectId,
    ["distribution"],
    fr.distributionJourney.closure.reopened,
    () => reopenDistributionClosure(input),
  );
}

export async function requestLift(input: {
  projectId: string;
  releaseId?: string | null;
  reserveId: string;
  note: string;
  proofPath: string;
  proofName: string;
  proofUrl: string;
}): Promise<WriteResult> {
  if (!id.safeParse(input.projectId).success) return invalid;
  return withOutcome(
    input.projectId,
    ["distribution"],
    fr.distributionJourney.closure.liftRequested,
    () => requestReserveLift(input),
  );
}

export async function decideLift(input: {
  projectId: string;
  releaseId?: string | null;
  reserveId: string;
  approve: boolean;
  note: string;
}): Promise<WriteResult> {
  if (!id.safeParse(input.projectId).success) return invalid;
  return withOutcome(
    input.projectId,
    ["distribution"],
    fr.distributionJourney.closure.liftDecided,
    () => decideReserveLift(input),
  );
}
