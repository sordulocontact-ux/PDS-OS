"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { networkPrivacy } from "@/lib/i18n/fr/network-privacy";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// « Rendre privé » / « Rendre partagé » (BIZ 8): one SQL function each, with
// the user's session; the database decides who may.

const t = networkPrivacy;

async function run(
  contactId: string,
  fn: "make_contact_private" | "make_contact_shared",
  done: string,
): Promise<WriteResult> {
  await requireApproved();
  if (!z.uuid().safeParse(contactId).success)
    return { ok: false, error: t.errors.generic };
  const supabase = await createClient();
  const { error } = await supabase.rpc(fn, { p_contact_id: contactId });
  if (error) {
    const known = t.errors[error.message ?? ""];
    if (!known) console.error(`${fn}:`, error.code, error.message);
    return { ok: false, error: known ?? t.errors.generic };
  }
  revalidatePath(routes.networkContact(contactId));
  revalidatePath(routes.network);
  return { ok: true, done };
}

export async function makeContactPrivate(contactId: string) {
  return run(contactId, "make_contact_private", t.done.private);
}

export async function makeContactShared(contactId: string) {
  return run(contactId, "make_contact_shared", t.done.shared);
}
