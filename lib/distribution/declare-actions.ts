"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  ANOMALY_KINDS,
  ANOMALY_MODULES,
  SEVERITIES,
} from "@/lib/distribution/anomalies";
import { fr } from "@/lib/i18n/fr";
import { withOutcome } from "@/lib/journey/outcome";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const e = fr.distribution.tracking.errors;
const t = fr.distributionJourney.orchard;

/** A database refusal of a declaration, in words. */
function failure(error: { code?: string; message?: string }): WriteResult {
  const message = error.message ?? "";
  const known: Array<[string, string]> = [
    ["not_validated", e.notValidated],
    ["not_deposited", e.notDeposited],
    ["already_declared", e.alreadyDeclared],
    ["already_withdrawn", e.alreadyWithdrawn],
    ["proof_exists", t.proofExists],
    ["reason_required", e.noteRequired],
    ["validation_pending", fr.distribution.anomalies.errors.validationPending],
  ];
  const hit = known.find(([code]) => message.includes(code));
  if (hit) return { ok: false, error: hit[1] };
  if (error.code === "42501") return { ok: false, error: e.forbidden };
  if (error.code === "23514" || error.code === "22023")
    return { ok: false, error: e.invalid };
  console.error("distribution declaration:", error.code, message);
  return { ok: false, error: e.generic };
}

const ok = (projectId: string): WriteResult => {
  revalidatePath(routes.project(projectId), "layout");
  return { ok: true };
};

const date = z
  .string()
  .transform((value) => value || null)
  .pipe(z.iso.date().nullable());
const proof = {
  proofPath: z.string().max(200),
  proofName: z.string().trim().max(255),
};

const depositSchema = z.object({
  projectId: z.uuid(),
  declaredOn: date,
  orchardId: z.string().trim().max(100),
  ...proof,
});

/** « Déclarer le dépôt »: the manual deposit, done by hand in The Orchard. */
export async function declareDeposit(
  input: z.input<typeof depositSchema>,
): Promise<WriteResult> {
  await requireApproved();
  const p = depositSchema.safeParse(input);
  if (!p.success) return { ok: false, error: e.invalid };
  const v = p.data;
  return withOutcome(
    v.projectId,
    ["distribution"],
    v.proofPath ? t.depositProven : t.depositDeclared,
    async () => {
      const supabase = await createClient();
      const { error } = await supabase.rpc("declare_distribution", {
        p_project_id: v.projectId,
        p_kind: "deposit",
        p_declared_on: v.declaredOn ?? undefined,
        p_orchard_id: v.orchardId,
        p_proof_path: v.proofPath,
        p_proof_name: v.proofName,
      });
      return error ? failure(error) : ok(v.projectId);
    },
  );
}

const answersSchema = z.object({
  projectId: z.uuid(),
  items: z
    .array(
      z.object({
        kind: z.enum(["received", "accepted", "platforms_delivered"]),
        declaredOn: date,
        ...proof,
      }),
    )
    .min(1)
    .max(3),
});

/** « Enregistrer » what The Orchard said, in one gesture (rule 7). */
export async function declareAnswers(
  input: z.input<typeof answersSchema>,
): Promise<WriteResult> {
  await requireApproved();
  const p = answersSchema.safeParse(input);
  if (!p.success) return { ok: false, error: t.nothingTicked };
  const { projectId, items } = p.data;
  return withOutcome(
    projectId,
    ["distribution"],
    items.length > 1
      ? t.answersSaved(items.length)
      : t.answerSaved[items[0].kind],
    async () => {
      const supabase = await createClient();
      const { error } = await supabase.rpc("declare_distribution_answers", {
        p_project_id: projectId,
        p_items: items.map((i) => ({
          kind: i.kind,
          declared_on: i.declaredOn,
          proof_path: i.proofPath,
          proof_name: i.proofName,
        })),
      });
      return error ? failure(error) : ok(projectId);
    },
  );
}

const attachSchema = z.object({
  projectId: z.uuid(),
  declarationId: z.uuid(),
  ...proof,
});

/** « Ajouter une preuve » to a declaration that had none. */
export async function attachProof(
  input: z.input<typeof attachSchema>,
): Promise<WriteResult> {
  await requireApproved();
  const p = attachSchema.safeParse(input);
  if (!p.success || !p.data.proofPath) return { ok: false, error: e.invalid };
  const supabase = await createClient();
  const { error } = await supabase.rpc(
    "attach_distribution_declaration_proof",
    {
      p_declaration_id: p.data.declarationId,
      p_proof_path: p.data.proofPath,
      p_proof_name: p.data.proofName,
    },
  );
  if (error) return failure(error);
  ok(p.data.projectId);
  return { ok: true, done: t.proofAdded };
}

const correctionsSchema = z.object({
  projectId: z.uuid(),
  note: z.string().trim().min(1).max(1000),
  kind: z.enum(ANOMALY_KINDS),
  module: z.enum(ANOMALY_MODULES),
  severity: z.enum(SEVERITIES),
  next: z.number().int().min(2),
});

/** « The Orchard demande des corrections »: the declaration, the anomaly
 * and the next version of the dossier, in one gesture. */
export async function declareCorrections(
  input: z.input<typeof correctionsSchema>,
): Promise<WriteResult> {
  await requireApproved();
  const p = correctionsSchema.safeParse(input);
  if (!p.success) return { ok: false, error: e.noteRequired };
  const v = p.data;
  return withOutcome(
    v.projectId,
    ["distribution"],
    t.correctionsDone(v.next),
    async () => {
      const supabase = await createClient();
      const { error } = await supabase.rpc("declare_distribution_corrections", {
        p_project_id: v.projectId,
        p_note: v.note,
        p_kind: v.kind,
        p_module: v.module,
        p_severity: v.severity,
      });
      return error ? failure(error) : ok(v.projectId);
    },
  );
}
