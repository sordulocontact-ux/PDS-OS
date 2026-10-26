"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { fr } from "@/lib/i18n/fr";
import { getNotification } from "@/lib/notifications/actions";
import { playChime } from "@/lib/notifications/chime";
import { createClient } from "@/lib/supabase/client";

// Coalesces a burst of notifications (one action notifies several times).
const DEBOUNCE_MS = 400;

// Listens to the signed-in person's new notifications (Supabase Realtime,
// RLS applies). They refresh the page, so a transmission or an answer shows
// up without reloading, and each pops a toast (with a chime) linking to its
// project. A refresh re-reads the whole page: one per burst, and a hidden
// tab waits until it is shown (docs/ARCHITECTURE.md § 3 bis).
export function NotificationListener({ personId }: { personId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let stale = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const refresh = () => {
      if (document.visibilityState !== "visible") {
        stale = true;
        return;
      }
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (active) router.refresh();
      }, DEBOUNCE_MS);
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !stale) return;
      stale = false;
      refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    const channel = supabase.channel(`notifications:${personId}`).on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `recipient_person_id=eq.${personId}`,
      },
      async (payload) => {
        refresh();
        const id = (payload.new as { id?: string }).id;
        if (!id) return;
        const item = await getNotification(id);
        if (!item || !active) return;
        // Visible tab: the app plays its own sound. Hidden tab: the system
        // notification (Web Push) takes over, with the macOS/Windows sound.
        if (document.visibilityState === "visible") playChime();
        toast(item.text, {
          id: item.id,
          action: {
            label: fr.notifications.open,
            onClick: () => router.push(item.href),
          },
        });
      },
    );

    // The session token must reach Realtime before subscribing, or RLS
    // treats the socket as anonymous and nothing arrives.
    supabase.realtime
      .setAuth()
      .catch(() => undefined)
      .finally(() => {
        if (active) channel.subscribe();
      });

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [personId, router]);

  return null;
}
