import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { after } from "next/server";
import webpush from "web-push";

import { fetchAccess } from "@/lib/auth/access";
import { getPublicEnv } from "@/lib/env-public";
import { getServerEnv } from "@/lib/env";
import { fr } from "@/lib/i18n/fr";
import {
  isNotificationKind,
  notificationHref,
  notificationText,
} from "@/lib/notifications/types";
import { personName } from "@/lib/projects/types";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

/**
 * Sends the Web Push of the notifications the current user has just caused.
 * Runs with the actor's own session (claim_push_deliveries only returns what
 * they caused): no service role. Call it after a write, inside `after()`.
 * Never throws: a failed push must not fail the action.
 */
export async function sendPendingPushes(
  supabase: SupabaseClient<Database>,
): Promise<void> {
  try {
    const publicKey = getPublicEnv().NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const { VAPID_PRIVATE_KEY, VAPID_SUBJECT } = getServerEnv();
    if (!publicKey || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) return;

    const { data: deliveries, error } = await supabase.rpc(
      "claim_push_deliveries",
    );
    if (error) throw error;
    if (!deliveries?.length) return;

    // Texts: the actor's name and the project titles, read with their session.
    const projectIds = [
      ...new Set(
        deliveries.flatMap((d) => (d.project_id ? [d.project_id] : [])),
      ),
    ];
    const [{ data: projects }, access] = await Promise.all([
      supabase.from("projects").select("id, title").in("id", projectIds),
      fetchAccess(supabase),
    ]);
    const titles = new Map((projects ?? []).map((p) => [p.id, p.title]));
    const actor = personName(access.firstName, access.lastName) || null;

    webpush.setVapidDetails(VAPID_SUBJECT, publicKey, VAPID_PRIVATE_KEY);
    await Promise.all(
      deliveries.map(async (d) => {
        if (!isNotificationKind(d.kind)) return;
        const payload = JSON.stringify({
          title: fr.notifications.systemTitle,
          body: notificationText(
            d.kind,
            actor,
            d.project_id ? (titles.get(d.project_id) ?? null) : null,
          ),
          url: notificationHref(d.kind, d.project_id),
          tag: d.notification_id,
        });
        try {
          await webpush.sendNotification(
            { endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } },
            payload,
            { TTL: 60 * 60 * 24 },
          );
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          // Gone: the browser unsubscribed or the subscription expired.
          if (status === 404 || status === 410) {
            await supabase.rpc("forget_push_subscription", {
              p_endpoint: d.endpoint,
            });
          } else {
            console.error("sendPendingPushes/send:", status ?? err);
          }
        }
      }),
    );
  } catch (err) {
    console.error("sendPendingPushes:", err);
  }
}

/**
 * To call right after a write that may notify someone: the pushes leave
 * once the response is sent, so the action never waits on push services.
 */
export async function schedulePendingPushes(): Promise<void> {
  const supabase = await createClient();
  after(() => sendPendingPushes(supabase));
}
