"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// « Envoyer pour signature » from a contract's page (send_contract, SQL,
// 20261020070101): on the person's private link when the contract comes
// from the Juridique and they have one, else how it went and the day. PDS
// OS sends no e-mail itself: the person sends the prepared one from their
// own mail app, and this records that it went (the proof of sending).

const input = z.object({
  contractId: z.uuid(),
  // To revalidate the project's pages (Juridique) too.
  projectId: z.uuid().nullable(),
  via: z.enum(["link", "other"]),
  how: z.string().trim().max(200).optional(),
  on: z.iso.date().optional(),
});

export async function sendContractForSignature(
  values: z.input<typeof input>,
): Promise<WriteResult> {
  const t = fr.signedReturns.team;
  const v = input.safeParse(values);
  if (!v.success) return { ok: false, error: t.errors.failed };
  const { contractId, projectId, via, how, on } = v.data;
  if (via === "other" && !how) return { ok: false, error: t.errors.how };
  if (via === "other" && !on) return { ok: false, error: t.errors.date };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_contract", {
    p_contract_id: contractId,
    p_via: via,
    p_how: via === "other" ? (how ?? null) : null,
    p_on: via === "other" ? (on ?? null) : null,
  });
  if (error) {
    const m = error.message ?? "";
    console.error("sendContractForSignature:", error.code, m);
    if (m.includes("contact_link_missing"))
      return { ok: false, error: t.errors.noLink };
    if (error.code === "23514") return { ok: false, error: t.errors.date };
    if (error.code === "42501" || m.includes("contract_not_allowed"))
      return { ok: false, error: fr.contracts.errors.forbidden };
    if (m.includes("contract_wrong_status"))
      return { ok: false, error: fr.contracts.errors.status };
    return { ok: false, error: t.errors.failed };
  }
  revalidatePath(routes.contracts);
  revalidatePath(routes.contract(contractId));
  if (projectId) revalidatePath(routes.project(projectId), "layout");
  return { ok: true };
}
