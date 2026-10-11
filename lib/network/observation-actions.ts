"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const schema = z.object({
  contactId: z.uuid(),
  kind: z.enum(["followers", "engagement_rate", "rate", "category"]),
  platform: z.string().max(60),
  value: z.number().nonnegative().max(1e12).nullable(),
  textValue: z.string().max(80),
  observedOn: z.iso.date(),
  source: z.enum(["agency", "creator", "internal", "platform", "independent"]),
  note: z.string().max(500),
});

const UNIT = {
  followers: "count",
  engagement_rate: "percent",
  rate: "eur",
  category: null,
} as const;

/** A dated observation of a profile ; never overwrites the earlier ones. */
export async function recordObservation(
  input: z.input<typeof schema>,
): Promise<WriteResult> {
  const access = await requireApproved();
  const parsed = schema.safeParse(input);
  const t = fr.network.page;
  if (!parsed.success || !access.organizationId)
    return { ok: false, error: t.observationValueRequired };
  const v = parsed.data;
  const category = v.kind === "category";
  if (category ? !v.textValue.trim() : v.value === null)
    return { ok: false, error: t.observationValueRequired };
  const supabase = await createClient();
  const { error } = await supabase.from("network_observations").insert({
    organization_id: access.organizationId,
    contact_id: v.contactId,
    kind: v.kind,
    platform: v.platform.trim() || null,
    value: category ? null : v.value,
    text_value: category ? v.textValue.trim() : null,
    unit: UNIT[v.kind],
    observed_on: v.observedOn,
    source: v.source,
    note: v.note.trim() || null,
  });
  if (error) {
    console.error("recordObservation:", error.message);
    return { ok: false, error: fr.activations.errors.generic };
  }
  revalidatePath(routes.networkContact(v.contactId));
  return { ok: true };
}

export async function invalidateObservation(input: {
  contactId: string;
  observationId: string;
  reason: string;
}): Promise<WriteResult> {
  await requireApproved();
  const parsed = z
    .object({
      contactId: z.uuid(),
      observationId: z.uuid(),
      reason: z.string().trim().min(1).max(500),
    })
    .safeParse(input);
  if (!parsed.success)
    return { ok: false, error: fr.activations.errors.reasonRequired };
  const supabase = await createClient();
  const { error } = await supabase
    .from("network_observations")
    .update({ invalidation_reason: parsed.data.reason })
    .eq("id", parsed.data.observationId);
  if (error) {
    console.error("invalidateObservation:", error.message);
    return { ok: false, error: fr.activations.errors.forbidden };
  }
  revalidatePath(routes.networkContact(parsed.data.contactId));
  return { ok: true };
}
