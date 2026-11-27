"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { auth } from "@/lib/i18n/fr/auth";
import { googleConnections } from "@/lib/i18n/fr/google-connections";
import { isGoogleService } from "@/lib/google/services";
import { loadWorkAddress } from "@/lib/google/work-address";
import { unsealGoogleToken } from "@/lib/google/token-seal";
import { revokeConnectToken } from "@/lib/integrations/google-connect";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const t = googleConnections;

const refusal = (error: { code?: string; message: string }, where: string) => {
  console.error(`${where}:`, error.message);
  return {
    ok: false as const,
    error: error.code === "42501" ? auth.errors.forbidden : t.failed,
  };
};

/**
 * Paramètres › Connexions: turns one service of one of the member's own
 * Google accounts on or off (off = PDS OS no longer reads it). The account
 * must be theirs: their work address or one they connected (RLS too).
 */
export async function setGoogleService(
  accountEmail: string,
  service: string,
  on: boolean,
): Promise<WriteResult> {
  const email = z.email().safeParse(accountEmail.trim().toLowerCase());
  if (!email.success || !isGoogleService(service))
    return { ok: false, error: t.failed };
  const access = await requireApproved();
  if (!access.personId) return { ok: false, error: t.failed };
  const supabase = await createClient();
  const [work, connected] = await Promise.all([
    loadWorkAddress(access),
    supabase
      .from("google_accounts")
      .select("id")
      .eq("email", email.data)
      .maybeSingle(),
  ]);
  if (work.email !== email.data && !connected.data)
    return { ok: false, error: t.failed };
  const { error } = on
    ? await supabase
        .from("google_service_opt_outs")
        .delete()
        .eq("person_id", access.personId)
        .eq("account_email", email.data)
        .eq("service", service)
    : await supabase
        .from("google_service_opt_outs")
        .insert({ account_email: email.data, service });
  // Already off (a second tab): nothing to change.
  if (error && error.code !== "23505")
    return refusal(error, "setGoogleService");
  revalidatePath(routes.settingsConnections);
  return { ok: true, done: on ? t.turnedOn(service) : t.turnedOff(service) };
}

/**
 * « Déconnecter » an account the member connected: PDS OS's access withdrawn
 * at Google, then the account and its choices forgotten.
 */
export async function disconnectGoogleAccount(
  id: string,
): Promise<WriteResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: t.failed };
  const access = await requireApproved();
  if (!access.personId) return { ok: false, error: t.failed };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("google_accounts")
    .delete()
    .eq("id", id)
    .select("email, refresh_token_sealed")
    .maybeSingle();
  if (error) return refusal(error, "disconnectGoogleAccount");
  if (!data) return { ok: false, error: t.failed };
  await revokeConnectToken(unsealGoogleToken(data.refresh_token_sealed), id);
  await supabase
    .from("google_service_opt_outs")
    .delete()
    .eq("person_id", access.personId)
    .eq("account_email", data.email);
  revalidatePath(routes.settingsConnections);
  return { ok: true, done: t.disconnected(data.email) };
}
