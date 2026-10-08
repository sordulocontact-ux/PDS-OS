"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

/**
 * Who the title's master split says holds the recording (Sacha,
 * 07/10/2026: what PDS knows is filled in): its label, else its producer,
 * the largest share first. Proposed for an empty ℗ holder, never saved
 * without the user. Read with the user's session.
 */
export async function suggestRightsHolder(
  masterId: string,
): Promise<{ name: string; role: "label" | "producer" } | null> {
  await requireApproved();
  const id = z.uuid().safeParse(masterId);
  if (!id.success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("master_splits")
    .select("party, role, share")
    .eq("master_id", id.data)
    .eq("kind", "master")
    .in("role", ["label", "producer"])
    .order("share", { ascending: false });
  if (error) console.error("suggestRightsHolder:", error.message);
  const rows = data ?? [];
  const row =
    rows.find((r) => r.role === "label") ??
    rows.find((r) => r.role === "producer");
  return row
    ? { name: row.party, role: row.role === "label" ? "label" : "producer" }
    : null;
}
