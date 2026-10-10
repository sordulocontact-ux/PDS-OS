"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fileExtension } from "@/lib/catalog/file-rules";
import { fr } from "@/lib/i18n/fr";
import { TOKEN } from "@/lib/master-workflow/transmission-public";
import { createClient } from "@/lib/supabase/server";

/**
 * "J'ai bien reçu le dossier", from the engineer's page, without an account:
 * the database checks the token and notifies the sender
 * (acknowledge_master_transmission). Returns the link's state after it.
 */
export async function acknowledgeMasterPackage(token: string): Promise<string> {
  if (!TOKEN.test(token)) return "unknown";
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "acknowledge_master_transmission",
    {
      p_token: token,
    },
  );
  if (error) {
    console.error("acknowledgeMasterPackage:", error.message);
    return "failed";
  }
  revalidatePath(`/m/${token}`);
  return data ?? "unknown";
}

export type DeliveryResult =
  { ok: true; path: string } | { ok: false; error: string };

const DELIVERY_ERRORS = [
  "replaced",
  "expired",
  "too_many_deposits",
  "title_not_in_package",
] as const;

// The database's refusal, as the engineer's page words it.
function deliveryError(message: string | undefined): string {
  const t = fr.masterWorkflow.publicPackage.deliver.errors;
  const known = DELIVERY_ERRORS.find((code) => message?.includes(code));
  return known ? t[known] : t.failed;
}

/**
 * « Déposer ma version », step 1, without an account: the database checks
 * the link and the title, then opens a one-time path of the master-files
 * bucket where the browser uploads the file (open_master_delivery).
 */
export async function openMasterDelivery(
  token: string,
  masterId: string,
  fileName: string,
): Promise<DeliveryResult> {
  if (!TOKEN.test(token) || !z.uuid().safeParse(masterId).success)
    return { ok: false, error: deliveryError(undefined) };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_master_delivery", {
    p_token: token,
    p_master_id: masterId,
    p_extension: fileExtension(fileName),
  });
  if (error || !data) {
    console.error("openMasterDelivery:", error?.message);
    return { ok: false, error: deliveryError(error?.message) };
  }
  return { ok: true, path: data };
}

/**
 * Step 2, once the file is uploaded: it becomes an audio version of the
 * title (Mix or Master), its versions and notifications follow in the
 * database (record_master_delivery).
 */
export async function recordMasterDelivery(
  token: string,
  path: string,
  fileName: string,
  mime: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!TOKEN.test(token)) return { ok: false, error: deliveryError(undefined) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_master_delivery", {
    p_token: token,
    p_path: path,
    p_file_name: fileName.slice(0, 255),
    p_mime: mime,
  });
  if (error) {
    console.error("recordMasterDelivery:", error.message);
    return { ok: false, error: deliveryError(error.message) };
  }
  revalidatePath(`/m/${token}`);
  return { ok: true };
}
