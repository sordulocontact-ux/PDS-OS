"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fr } from "@/lib/i18n/fr";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { createClient } from "@/lib/supabase/server";
import { LINK_KEY, linkKeyArgs, linkKeyPath } from "@/lib/portal/link-key";

// The creator's gestures on her private link, without an account: the
// database checks the token and the step (20261019060201).

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const token = z.string().regex(LINK_KEY);
const url = z
  .string()
  .trim()
  .regex(/^https?:\/\/\S+$/)
  .max(2000);

function failure(message: string | undefined): { ok: false; error: string } {
  const e = fr.activationCreator.errors;
  if (message?.includes("url_invalid")) return { ok: false, error: e.url };
  if (message?.includes("collaboration_link_closed"))
    return { ok: false, error: e.closed };
  if (message?.includes("invalid_transition"))
    return { ok: false, error: e.step };
  if (message?.includes("upload_missing"))
    return { ok: false, error: e.upload };
  // The activation is not launched, or closed, suspended (20261026400101).
  if (message?.includes("collaboration_frozen"))
    return { ok: false, error: e.paused };
  console.error("creator link:", message);
  return { ok: false, error: e.failed };
}

async function done(t: string): Promise<{ ok: true }> {
  await schedulePendingPushes();
  revalidatePath(linkKeyPath("i", t));
  return { ok: true };
}

/** « Envoyer la V2 »: the link of her video, not published. */
export async function submitCreatorContent(input: {
  token: string;
  url: string;
}): Promise<Result> {
  const v = z.object({ token, url }).safeParse(input);
  if (!v.success) return failure("url_invalid");
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_influence_content_by_token", {
    ...linkKeyArgs(v.data.token),
    p_url: v.data.url,
  });
  return error ? failure(error.message) : done(v.data.token);
}

/** « Déclarer la publication ». */
export async function declareCreatorPublication(input: {
  token: string;
  url: string;
}): Promise<Result> {
  const v = z.object({ token, url }).safeParse(input);
  if (!v.success) return failure("url_invalid");
  const supabase = await createClient();
  const { error } = await supabase.rpc(
    "declare_influence_publication_by_token",
    {
      ...linkKeyArgs(v.data.token),
      p_url: v.data.url,
    },
  );
  return error ? failure(error.message) : done(v.data.token);
}

/** Step 1 of the invoice: a one-time path where the browser uploads it. */
export async function openCreatorInvoiceSlot(input: {
  token: string;
  fileName: string;
}): Promise<Result<{ path: string }>> {
  const v = z
    .object({ token, fileName: z.string().trim().min(1).max(255) })
    .safeParse(input);
  if (!v.success) return failure(undefined);
  const ext =
    /\.([a-z0-9]{1,10})$/i.exec(v.data.fileName)?.[1]?.toLowerCase() ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_influence_invoice_slot", {
    ...linkKeyArgs(v.data.token),
    p_ext: ext,
  });
  if (error || !data) return failure(error?.message);
  return { ok: true, path: data };
}

/** Step 2: « Envoyer la facture », the uploaded file recorded. */
export async function submitCreatorInvoice(input: {
  token: string;
  path: string;
  fileName: string;
  mime: string;
  bytes: number;
}): Promise<Result> {
  const v = z
    .object({
      token,
      path: z.string().max(400),
      fileName: z.string().trim().min(1).max(255),
      mime: z.string().max(255),
      bytes: z.number().int().positive().max(209715200),
    })
    .safeParse(input);
  if (!v.success) return failure(undefined);
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_influence_invoice_by_token", {
    ...linkKeyArgs(v.data.token),
    p_path: v.data.path,
    p_file_name: v.data.fileName,
    p_mime: v.data.mime || "application/octet-stream",
    p_bytes: v.data.bytes,
  });
  return error ? failure(error.message) : done(v.data.token);
}
