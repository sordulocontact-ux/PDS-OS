"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { loadNotification } from "@/lib/notifications/queries";
import { isPushServiceUrl } from "@/lib/notifications/push-hosts";
import type { NotificationItem } from "@/lib/notifications/types";
import { createClient } from "@/lib/supabase/server";

// Null = everything unread.
export async function markNotificationsRead(ids: string[] | null) {
  await requireApproved();
  const parsed = z.array(z.uuid()).max(100).nullable().safeParse(ids);
  if (!parsed.success) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_notifications_read", {
    p_ids: parsed.data ?? undefined,
  });
  if (error) console.error("markNotificationsRead:", error.message);
  revalidatePath(routes.app, "layout");
}

// For the toast shown when Realtime announces a new notification.
export async function getNotification(
  id: string,
): Promise<NotificationItem | null> {
  await requireApproved();
  if (!z.uuid().safeParse(id).success) return null;
  return loadNotification(id);
}

const subscriptionSchema = z.object({
  endpoint: z.url().max(2000).refine(isPushServiceUrl),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(500),
  }),
});

export async function savePushSubscription(input: unknown): Promise<boolean> {
  await requireApproved();
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return false;
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: parsed.data.endpoint,
    p_p256dh: parsed.data.keys.p256dh,
    p_auth: parsed.data.keys.auth,
  });
  if (error) console.error("savePushSubscription:", error.message);
  return !error;
}

export async function removePushSubscription(endpoint: string) {
  await requireApproved();
  if (!z.url().safeParse(endpoint).success) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("forget_push_subscription", {
    p_endpoint: endpoint,
  });
  if (error) console.error("removePushSubscription:", error.message);
}
