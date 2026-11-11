"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { dealFailure } from "@/lib/deals/errors";
import { dealContacts } from "@/lib/i18n/fr/deal-contacts";
import { deals } from "@/lib/i18n/fr/deals";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// The people of a deal (BIZ 8): linked by whoever writes it; a private
// contact only by its owner or the direction (the database refuses anyone
// else and writes the refusal in the contact's journal).

const t = dealContacts;
const ids = z.object({ dealId: z.uuid(), contactId: z.uuid() });

function failure(where: string, error: { code?: string; message?: string }) {
  return t.errors[error.message ?? ""] ?? dealFailure(where, error);
}

export async function linkDealContact(
  dealId: string,
  contactId: string,
): Promise<WriteResult> {
  await requireApproved();
  const p = ids.safeParse({ dealId, contactId });
  if (!p.success) return { ok: false, error: deals.errors.invalid };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("link_deal_contact", {
    p_deal_id: p.data.dealId,
    p_contact_id: p.data.contactId,
  });
  if (error) return { ok: false, error: failure("linkDealContact", error) };
  if (data === "refused") return { ok: false, error: t.refused };
  if (data === "unchanged") return { ok: false, error: t.already };
  revalidatePath(routes.deal(p.data.dealId));
  return { ok: true, done: t.linked };
}

export async function unlinkDealContact(
  dealId: string,
  contactId: string,
): Promise<WriteResult> {
  await requireApproved();
  const p = ids.safeParse({ dealId, contactId });
  if (!p.success) return { ok: false, error: deals.errors.invalid };
  const supabase = await createClient();
  const { error } = await supabase.rpc("unlink_deal_contact", {
    p_deal_id: p.data.dealId,
    p_contact_id: p.data.contactId,
  });
  if (error) return { ok: false, error: failure("unlinkDealContact", error) };
  revalidatePath(routes.deal(p.data.dealId));
  return { ok: true, done: t.unlinked };
}
