"use server";

import { z } from "zod";

import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import { SACEM_725_FIELDS } from "@/lib/legal/formalities/definition";
import { run } from "@/lib/legal/formalities/run";

// The steps after the dossier (ticket Juridique 06): the bulletin, its
// signatures, the deposit, the processing, a correction, the result.

const id = catalogIdSchema;
const KEYS = SACEM_725_FIELDS.map((f) => f.key);

export async function generateFormality(
  projectId: string,
  formalityId: string,
) {
  const p = z
    .object({ projectId: id, formalityId: id })
    .safeParse({ projectId, formalityId });
  if (!p.success)
    return { ok: false as const, error: fr.auth.errors.forbidden };
  return run(projectId, (s) =>
    s.rpc("generate_formality_document", { p_formality_id: formalityId }),
  );
}

export async function formalityStep(
  projectId: string,
  formalityId: string,
  action: "partial" | "submit" | "processing",
  text: string,
) {
  const p = z
    .object({
      projectId: id,
      formalityId: id,
      text: z.string().trim().max(2000),
    })
    .safeParse({ projectId, formalityId, text });
  if (!p.success)
    return { ok: false as const, error: fr.auth.errors.forbidden };
  return run(projectId, (s) =>
    action === "partial"
      ? s.rpc("declare_formality_partial", {
          p_formality_id: formalityId,
          p_reason: p.data.text,
        })
      : action === "submit"
        ? s.rpc("submit_formality", {
            p_formality_id: formalityId,
            p_proof: p.data.text,
          })
        : s.rpc("mark_formality_processing", { p_formality_id: formalityId }),
  );
}

export async function requireFormalityAction(
  projectId: string,
  formalityId: string,
  fields: string[],
  note: string,
) {
  const p = z
    .object({
      projectId: id,
      formalityId: id,
      fields: z.array(z.enum(KEYS as [string, ...string[]])).min(1),
      note: z.string().trim().max(2000),
    })
    .safeParse({ projectId, formalityId, fields, note });
  if (!p.success)
    return { ok: false as const, error: fr.legalFormalities.errors.reason };
  return run(projectId, (s) =>
    s.rpc("require_formality_action", {
      p_formality_id: formalityId,
      p_fields: p.data.fields,
      p_note: p.data.note,
    }),
  );
}

export async function completeFormality(
  projectId: string,
  formalityId: string,
  proof: string,
  externalId: string,
  iswc: string,
) {
  const p = z
    .object({
      projectId: id,
      formalityId: id,
      proof: z.string().trim().max(2000),
      externalId: z.string().trim().max(100),
      iswc: z.string().trim().max(20),
    })
    .safeParse({ projectId, formalityId, proof, externalId, iswc });
  if (!p.success)
    return { ok: false as const, error: fr.auth.errors.forbidden };
  return run(projectId, (s) =>
    s.rpc("complete_formality", {
      p_formality_id: formalityId,
      p_proof: p.data.proof,
      p_external_id: p.data.externalId || null,
      p_iswc: p.data.iswc || null,
    }),
  );
}
