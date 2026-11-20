import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { dealFailure } from "@/lib/deals/errors";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";
import { deals } from "@/lib/i18n/fr/deals";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// One gesture on a deal's memo = one SQL function, with the user's session;
// the database decides who may (memo-actions.ts, memo-mail-actions.ts).

export const uuid = z.uuid();

export type Supabase = Awaited<ReturnType<typeof createClient>>;

/** The function's refusal in words, else the deal's generic failure. */
export function memoFailure(
  where: string,
  error: { code?: string; message?: string },
): string {
  return dealMemos.errors[error.message ?? ""] ?? dealFailure(where, error);
}

export async function runMemoGesture(
  dealId: string,
  where: string,
  done: string,
  call: (
    supabase: Supabase,
  ) => PromiseLike<{ error: { code?: string; message?: string } | null }>,
): Promise<WriteResult> {
  await requireApproved();
  if (!uuid.safeParse(dealId).success)
    return { ok: false, error: deals.errors.invalid };
  const { error } = await call(await createClient());
  if (error) return { ok: false, error: memoFailure(where, error) };
  revalidatePath(routes.deal(dealId));
  return { ok: true, done };
}
