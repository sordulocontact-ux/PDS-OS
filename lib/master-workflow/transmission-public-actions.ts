"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fileExtension } from "@/lib/catalog/file-rules";
import {
  DELIVERY_EXTENSIONS,
  deliveryNameOk,
} from "@/lib/master-workflow/delivery-rules";
import { fr } from "@/lib/i18n/fr";
import { ENGINEER_MESSAGE_KINDS } from "@/lib/master-workflow/engineer-messages";
import { TOKEN } from "@/lib/master-workflow/transmission-public";
import { createClient } from "@/lib/supabase/server";
import { linkKeyArgs, linkKeyPath } from "@/lib/portal/link-key";

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
      ...linkKeyArgs(token),
    },
  );
  if (error) {
    console.error("acknowledgeMasterPackage:", error.message);
    return "failed";
  }
  revalidatePath(linkKeyPath("m", token));
  return data ?? "unknown";
}

/**
 * « Prendre en charge le dossier », from the engineer's page, without an
 * account: the rates confirmed (null) or proposed, in cents. The database
 * checks the token, notes the taking charge, puts the amounts in the
 * budget as « proposed » and tells the sender (take_master_transmission).
 */
export async function takeMasterPackage(
  token: string,
  mixCents: number | null,
  masteringCents: number | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const t = fr.masterRound.take;
  const amount = z.number().int().min(0).max(100_000_000).nullable();
  if (
    !TOKEN.test(token) ||
    !amount.safeParse(mixCents).success ||
    !amount.safeParse(masteringCents).success
  )
    return { ok: false, error: t.errors.amount };
  const supabase = await createClient();
  const { error } = await supabase.rpc("take_master_transmission", {
    ...linkKeyArgs(token),
    p_mix_cents: mixCents,
    p_mastering_cents: masteringCents,
  });
  if (error) {
    console.error("takeMasterPackage:", error.message);
    return { ok: false, error: t.errors.failed };
  }
  revalidatePath(linkKeyPath("m", token));
  return { ok: true };
}

/**
 * « Proposer ce montant », by the engineer after the label refused their
 * rate: the line is proposed again and the owner notified.
 */
export async function proposeMasterRate(
  token: string,
  role: "mix" | "mastering",
  cents: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const t = fr.masterRound.take;
  const input = z
    .object({
      role: z.enum(["mix", "mastering"]),
      cents: z.number().int().min(0).max(100_000_000),
    })
    .safeParse({ role, cents });
  if (!TOKEN.test(token)) return { ok: false, error: t.errors.counterFailed };
  if (!input.success) return { ok: false, error: t.errors.amount };
  const supabase = await createClient();
  const { error } = await supabase.rpc("propose_master_rate", {
    ...linkKeyArgs(token),
    p_role: input.data.role,
    p_cents: input.data.cents,
  });
  if (error) {
    console.error("proposeMasterRate:", error.message);
    return { ok: false, error: t.errors.counterFailed };
  }
  revalidatePath(linkKeyPath("m", token));
  return { ok: true };
}

export type DeliveryResult =
  { ok: true; path: string } | { ok: false; error: string };

const DELIVERY_ERRORS = [
  "file_mismatch",
  "invalid_extension",
  "invalid_file_name",
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
  // Checked here for the message, then by the database (PROJ-BUG-08).
  const extension = fileExtension(fileName);
  if (!extension || !DELIVERY_EXTENSIONS.includes(extension))
    return { ok: false, error: deliveryError("invalid_extension") };
  if (!deliveryNameOk(fileName))
    return { ok: false, error: deliveryError("invalid_file_name") };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_master_delivery", {
    ...linkKeyArgs(token),
    p_master_id: masterId,
    p_extension: extension,
    p_file_name: fileName,
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
  // The size of the file the engineer confirmed (PROJ-BUG-09).
  bytes: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!TOKEN.test(token) || !Number.isSafeInteger(bytes) || bytes <= 0)
    return { ok: false, error: deliveryError(undefined) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_master_delivery", {
    ...linkKeyArgs(token),
    p_path: path,
    p_file_name: fileName.slice(0, 255),
    p_mime: mime,
    p_bytes: bytes,
  });
  if (error) {
    console.error("recordMasterDelivery:", error.message);
    return { ok: false, error: deliveryError(error.message) };
  }
  revalidatePath(linkKeyPath("m", token));
  return { ok: true };
}

const engineerMessage = z.object({
  token: z.string().regex(TOKEN),
  kind: z.enum(ENGINEER_MESSAGE_KINDS),
  body: z.string().trim().min(1).max(2000),
  delayDays: z.number().int().min(1).max(90).nullable(),
});

/**
 * A message or a signal from the engineer's page (PROJ-AMEL-02): « Poser une
 * question », « Signaler un retard » (how many days), « Signaler un fichier
 * manquant ». The database checks the token, dates it, ties it to the
 * stage and tells the project's owner (post_master_engineer_message).
 */
export async function postEngineerMessage(
  input: z.input<typeof engineerMessage>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const t = fr.masterWorkflow.engineerThread;
  const parsed = engineerMessage.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.invalid };
  const v = parsed.data;
  if (v.kind === "delay" && !v.delayDays)
    return { ok: false, error: t.delayDaysRequired };
  const supabase = await createClient();
  const { error } = await supabase.rpc("post_master_engineer_message", {
    ...linkKeyArgs(v.token),
    p_kind: v.kind,
    p_body: v.body,
    p_delay_days: v.kind === "delay" ? v.delayDays : null,
  });
  if (error) {
    console.error("postEngineerMessage:", error.message);
    const message = error.message ?? "";
    return {
      ok: false,
      error:
        message.includes("expired") || message.includes("replaced")
          ? t.linkClosed
          : t.failed,
    };
  }
  revalidatePath(linkKeyPath("m", v.token));
  return { ok: true };
}
