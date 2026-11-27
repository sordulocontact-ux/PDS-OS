"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";
import { routes } from "@/lib/auth/redirects";

const t = fr.invoices.billing;

const billing = z.object({
  legalName: z.string().trim().min(1).max(200),
  address: z.string().trim().min(1).max(500),
  siret: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s/g, ""))
    .refine((v) => v === "" || /^\d{14}$/.test(v)),
  vat: z.string().trim().max(30),
  phone: z.string().trim().max(40).default(""),
  email: z.union([z.literal(""), z.email().max(200)]).default(""),
  website: z.string().trim().max(200).default(""),
});

/** « Enregistrer » the billing identity: the administration (RLS). */
export async function saveBilling(
  input: z.input<typeof billing>,
): Promise<WriteResult> {
  const v = billing.safeParse(input);
  if (!v.success) return { ok: false, error: t.failed };
  const access = await requireApproved();
  if (!access.organizationId) return { ok: false, error: t.failed };
  const supabase = await createClient();
  const values = {
    legal_name: v.data.legalName,
    address: v.data.address,
    siret: v.data.siret || null,
    vat_number: v.data.vat || null,
    phone: v.data.phone || null,
    email: v.data.email || null,
    website: v.data.website || null,
  };
  // Update the row when it exists, else create it (no upsert: the
  // organization never changes, it is not updatable).
  const updated = await supabase
    .from("organization_billing")
    .update(values)
    .eq("organization_id", access.organizationId)
    .select("organization_id");
  const { error } =
    updated.error || (updated.data?.length ?? 0) > 0
      ? updated
      : await supabase
          .from("organization_billing")
          .insert({ organization_id: access.organizationId, ...values });
  if (error) {
    console.error("saveBilling:", error.message);
    return {
      ok: false,
      error: error.code === "42501" ? fr.auth.errors.forbidden : t.failed,
    };
  }
  revalidatePath(routes.settingsBilling);
  return { ok: true, done: t.saved };
}
