"use server";

import { requireApproved } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

/** « J'ai compris »: the card is closed for good (kept in the database). */
export async function dismissWelcome(): Promise<{ ok: boolean }> {
  const access = await requireApproved();
  if (!access.personId || !access.organizationId) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase
    .from("member_welcomes")
    .upsert(
      { organization_id: access.organizationId, person_id: access.personId },
      { onConflict: "organization_id,person_id", ignoreDuplicates: true },
    );
  if (error) console.error("dismissWelcome:", error.message);
  return { ok: !error };
}
