"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { run } from "@/lib/legal/formalities/run";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// The team's side of what comes back signed (20261020070101): a contract
// sent on the person's private link or handed otherwise (how, and the day);
// a signature of the bulletin made otherwise, with its day.

const t = fr.signedReturns.team;
const day = z.iso.date();

export async function sendContract(input: {
  projectId: string;
  contractId: string;
  via: "link" | "other";
  how?: string;
  on?: string;
}): Promise<WriteResult> {
  const v = z
    .object({
      projectId: z.uuid(),
      contractId: z.uuid(),
      via: z.enum(["link", "other"]),
      how: z.string().trim().max(200).optional(),
      on: day.optional(),
    })
    .safeParse(input);
  if (!v.success) return { ok: false, error: t.errors.failed };
  if (v.data.via === "other" && !v.data.how)
    return { ok: false, error: t.errors.how };
  if (v.data.via === "other" && !v.data.on)
    return { ok: false, error: t.errors.date };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_contract", {
    p_contract_id: v.data.contractId,
    p_via: v.data.via,
    p_how: v.data.via === "other" ? (v.data.how ?? null) : null,
    p_on: v.data.via === "other" ? (v.data.on ?? null) : null,
  });
  if (error) {
    const m = error.message ?? "";
    console.error("sendContract:", error.code, m);
    if (m.includes("contact_link_missing"))
      return { ok: false, error: t.errors.noLink };
    if (error.code === "23514") return { ok: false, error: t.errors.date };
    if (error.code === "42501" || m.includes("contract_not_allowed"))
      return { ok: false, error: fr.contracts.errors.forbidden };
    if (m.includes("contract_wrong_status"))
      return { ok: false, error: fr.contracts.errors.status };
    return { ok: false, error: t.errors.failed };
  }
  revalidatePath(routes.project(v.data.projectId), "layout");
  revalidatePath(routes.contract(v.data.contractId));
  return { ok: true };
}

/** « A signé autrement » + « Signé le »: the day is the proof. */
export async function noteFormalitySignature(
  projectId: string,
  signatureId: string,
  signedOn: string,
) {
  const p = z
    .object({ projectId: z.uuid(), signatureId: z.uuid(), signedOn: day })
    .safeParse({ projectId, signatureId, signedOn });
  if (!p.success)
    return {
      ok: false as const,
      error: fr.signedReturns.sacem.signedOnMissing,
    };
  return run(projectId, (s) =>
    s.rpc("note_formality_signature", {
      p_signature_id: p.data.signatureId,
      p_signed_on: p.data.signedOn,
    }),
  );
}
