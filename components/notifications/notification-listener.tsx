"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { fr } from "@/lib/i18n/fr";
import { getNotification } from "@/lib/notifications/actions";
import { playChime } from "@/lib/notifications/chime";
import { createClient } from "@/lib/supabase/client";

// Listens to the signed-in person's new notifications (Supabase Realtime,
// RLS applies). Each one refreshes the page, so a transmission or an answer
// shows up without reloading, and pops a toast (with a chime) linking to
// its project.
export function NotificationListener({ personId }: { personId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    const channel = supabase.channel(`notifications:${personId}`).on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `recipient_person_id=eq.${personId}`,
      },
      async (payload) => {
        router.refresh();
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
      supabase.removeChannel(channel);
    };
  }, [personId, router]);

  return null;
}
