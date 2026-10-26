"use server";

import { z } from "zod";

import { prepareDistributionVersion } from "@/lib/distribution/anomalies-actions";
import {
  decideDistributionVersion,
  grantDistributionDerogation,
  revokeDistributionDerogation,
  submitDistributionVersion,
} from "@/lib/distribution/validation-actions";
import type {
  DerogationScope,
  RefusalModule,
} from "@/lib/distribution/validation";
import { fr } from "@/lib/i18n/fr";
import { withOutcome } from "@/lib/journey/outcome";
import type { WriteResult } from "@/lib/utils/write-result";

const t = fr.distributionJourney.dossier;
const id = z.uuid();

// The gestures of the step « Dossier de livraison », each saying what
// follows (VISION-UX rule 7): the journeys read before and after the write
// (lib/journey/outcome.ts), the toast with the verb of the button.

/** « Soumettre la Vn à Claire Morel ». */
export async function submitDossier(input: {
  projectId: string;
  number: number;
  validator: string;
}): Promise<WriteResult> {
  if (!id.safeParse(input.projectId).success)
    return { ok: false, error: fr.distribution.validation.errors.invalid };
  return withOutcome(
    input.projectId,
    ["distribution"],
    t.submitted(input.number, input.validator),
    () => submitDistributionVersion({ projectId: input.projectId }),
  );
}

/** « Valider la Vn » / « Refuser » (motif), by the validator asked. */
export async function decideDossier(input: {
  projectId: string;
  versionId: string;
  number: number;
  approve: boolean;
  note: string;
  owner: string;
  modules: RefusalModule[];
}): Promise<WriteResult> {
  if (!id.safeParse(input.projectId).success)
    return { ok: false, error: fr.distribution.validation.errors.invalid };
  return withOutcome(
    input.projectId,
    ["distribution"],
    input.approve
      ? t.approved(input.number)
      : t.refused(input.number, input.owner),
    () =>
      decideDistributionVersion({
        projectId: input.projectId,
        versionId: input.versionId,
        approve: input.approve,
        note: input.note,
        modules: input.modules,
      }),
  );
}

/** « Préparer la Vn » after a correction at the source. */
export async function prepareNextDossier(input: {
  projectId: string;
  number: number;
  note: string;
  modules?: string[];
}): Promise<WriteResult> {
  if (!id.safeParse(input.projectId).success)
    return { ok: false, error: fr.distribution.validation.errors.invalid };
  return withOutcome(
    input.projectId,
    ["distribution"],
    t.prepared(input.number),
    () =>
      prepareDistributionVersion({
        projectId: input.projectId,
        note: input.note,
        modules: input.modules,
      }),
  );
}

/** « Accorder la dérogation » (the direction). */
export async function grantDerogation(input: {
  projectId: string;
  scope: DerogationScope[];
  risk: string;
  reason: string;
  dueOn: string;
}): Promise<WriteResult> {
  if (!id.safeParse(input.projectId).success)
    return { ok: false, error: fr.distribution.validation.errors.invalid };
  return withOutcome(
    input.projectId,
    ["distribution"],
    fr.distributionJourney.derogation.granted,
    () => grantDistributionDerogation(input),
  );
}

/** « Retirer la dérogation » not used yet. */
export async function revokeDerogation(input: {
  projectId: string;
}): Promise<WriteResult> {
  if (!id.safeParse(input.projectId).success)
    return { ok: false, error: fr.distribution.validation.errors.invalid };
  return withOutcome(
    input.projectId,
    ["distribution"],
    fr.distributionJourney.derogation.revoked,
    () => revokeDistributionDerogation(input),
  );
}
