"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fileExtension } from "@/lib/catalog/file-rules";
import { fr } from "@/lib/i18n/fr";
import { LINK_KEY, linkKeyArgs, linkKeyPath } from "@/lib/portal/link-key";
import { createClient } from "@/lib/supabase/server";

// A deliverable deposited on the engineer's link, in two steps as a
// version: a one-time path, then the file recorded (open_ and
// record_master_deliverable). The database checks the link, that the
// Brief expects it and that the title has its Master final.

const t = fr.masterWorkflow.publicPackage.deliver;
const CODES = [
  "file_mismatch",
  "invalid_extension",
  "invalid_file_name",
  "replaced",
  "expired",
  "too_many_deposits",
] as const;
const errorOf = (message: string | undefined) => {
  const code = CODES.find((c) => message?.includes(c));
  return code ? t.errors[code] : t.errors.failed;
};

export async function openDeliverable(
  key: string,
  masterId: string,
  deliverable: string,
  fileName: string,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const extension = fileExtension(fileName);
  if (
    !LINK_KEY.test(key) ||
    !z.uuid().safeParse(masterId).success ||
    !extension
  )
    return { ok: false, error: errorOf(undefined) };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_master_deliverable", {
    ...linkKeyArgs(key),
    p_master_id: masterId,
    p_deliverable: deliverable,
    p_extension: extension,
    p_file_name: fileName,
  });
  if (error || !data) {
    console.error("openDeliverable:", error?.message);
    return { ok: false, error: errorOf(error?.message) };
  }
  return { ok: true, path: data };
}

export async function recordDeliverable(
  key: string,
  path: string,
  fileName: string,
  mime: string,
  bytes: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!LINK_KEY.test(key) || !Number.isSafeInteger(bytes) || bytes <= 0)
    return { ok: false, error: errorOf(undefined) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_master_deliverable", {
    ...linkKeyArgs(key),
    p_path: path,
    p_file_name: fileName.slice(0, 255),
    p_mime: mime,
    p_bytes: bytes,
  });
  if (error) {
    console.error("recordDeliverable:", error.message);
    return { ok: false, error: errorOf(error.message) };
  }
  revalidatePath(linkKeyPath("m", key));
  return { ok: true };
}
