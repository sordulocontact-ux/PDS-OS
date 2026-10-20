"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { signedReturnError } from "@/lib/legal/signed-returns/errors";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { createClient } from "@/lib/supabase/server";

// « Envoyer mon contrat signé » / « Envoyer le bulletin signé » from the
// person's page by project (/c/), without an account: the database checks
// the link, the person, the project and the document (20261020070101).

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const input = z.object({
  token: z.string().regex(/^[0-9a-f]{64}$/),
  kind: z.enum(["contract", "bulletin"]),
  id: z.uuid(),
});
type SignedInput = z.infer<typeof input>;

/** Step 1: a one-time path where the browser uploads the PDF. */
export async function openSignedReturnSlot(
  value: SignedInput,
): Promise<Result<{ path: string }>> {
  const v = input.safeParse(value);
  if (!v.success) return { ok: false, error: signedReturnError(undefined) };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_signed_return_slot", {
    p_contact_token: v.data.token,
    p_kind: v.data.kind,
    p_object_id: v.data.id,
  });
  if (error || !data)
    return { ok: false, error: signedReturnError(error?.message) };
  return { ok: true, path: data };
}

/** Step 2: the signed copy kept with its contract, or the signature recorded. */
export async function submitSignedReturn(
  value: SignedInput & { path: string; fileName: string },
): Promise<Result> {
  const v = input
    .extend({
      path: z.string().min(1).max(400),
      fileName: z.string().trim().min(1).max(255),
    })
    .safeParse(value);
  if (!v.success) return { ok: false, error: signedReturnError(undefined) };
  const supabase = await createClient();
  const { error } =
    v.data.kind === "contract"
      ? await supabase.rpc("submit_signed_contract", {
          p_contact_token: v.data.token,
          p_contract_id: v.data.id,
          p_path: v.data.path,
          p_file_name: v.data.fileName,
        })
      : await supabase.rpc("submit_signed_bulletin", {
          p_contact_token: v.data.token,
          p_signature_id: v.data.id,
          p_path: v.data.path,
          p_file_name: v.data.fileName,
        });
  if (error) return { ok: false, error: signedReturnError(error.message) };
  await schedulePendingPushes();
  revalidatePath(`/c/${v.data.token}`);
  return { ok: true };
}
