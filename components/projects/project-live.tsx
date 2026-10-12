"use client";

import { useEffect, useRef, useTransition } from "react";

import { fr } from "@/lib/i18n/fr";
import { refreshProjectData } from "@/lib/projects/live-actions";
import { createClient } from "@/lib/supabase/client";

// Coalesces a burst of changes (one action writes several rows).
const DEBOUNCE_MS = 400;

/**
 * Keeps the pages of a project up to date (JUR-12 / JUR-28): a change of
 * the Juridique in this tab, another tab, by a teammate or through a public
 * link bumps project_live; the pages are then read again, without a manual
 * reload. Also on coming back to the tab, after sleep or a lost network.
 * While it reads, a short « Mise à jour… » says so.
 */
export function ProjectLive({ projectId }: { projectId: string }) {
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let subscribedOnce = false;

    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (!active) return;
        startTransition(async () => {
          await refreshProjectData(projectId);
        });
      }, DEBOUNCE_MS);
    };

    const channel = supabase.channel(`project-live:${projectId}`).on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "project_live",
        filter: `project_id=eq.${projectId}`,
      },
      refresh,
    );

    // The session token must reach Realtime before subscribing, or RLS
    // treats the socket as anonymous and nothing arrives. A new
    // subscription after the first (reconnection) may have missed changes.
    supabase.realtime
      .setAuth()
      .catch(() => undefined)
      .finally(() => {
        if (!active) return;
        channel.subscribe((status) => {
          if (status !== "SUBSCRIBED") return;
          if (subscribedOnce) refresh();
          subscribedOnce = true;
        });
      });

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", refresh);

    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", refresh);
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  if (!pending) return null;
  return (
    <p
      role="status"
      className="pointer-events-none fixed right-4 bottom-4 z-50 rounded-full border border-border bg-background px-3 py-1.5 text-caption text-muted-foreground shadow-elevation-1"
    >
      {fr.shell.project.live.updating}
    </p>
  );
}
