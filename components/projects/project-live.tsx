"use client";

import { useEffect, useRef, useTransition } from "react";

import { fr } from "@/lib/i18n/fr";
import { refreshProjectData } from "@/lib/projects/live-actions";
import { createClient } from "@/lib/supabase/client";

// Coalesces a burst of changes (one action writes several rows).
const DEBOUNCE_MS = 400;

type LiveRow = { version?: number; changed_by?: string | null };

/**
 * Keeps the pages of a project up to date (JUR-12 / JUR-28): a change of
 * the Juridique in another tab, by a teammate or through a public link
 * bumps project_live; the pages are then read again, without a manual
 * reload. While it reads, a short « Mise à jour… » says so.
 *
 * A refresh re-reads the whole project and empties the router cache (its
 * prefetched views), so it only runs for a change this tab has not shown
 * yet (docs/ARCHITECTURE.md § 3 bis, page loads audit of 26/10):
 * - the person's own change, in the tab they see, is skipped: the action
 *   that wrote it already re-read the page (revalidatePath);
 * - coming back to the tab, after sleep, a lost network or a Realtime
 *   reconnection, the version is compared first (one small read): no
 *   change, no refresh.
 */
export function ProjectLive({
  projectId,
  accountId,
}: {
  projectId: string;
  accountId: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let subscribedOnce = false;
    // The version this tab shows; null until read (nothing to compare yet).
    let shown: number | null = null;

    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (!active) return;
        startTransition(async () => {
          await refreshProjectData(projectId);
        });
      }, DEBOUNCE_MS);
    };

    const readVersion = async (): Promise<number | null> => {
      const { data } = await supabase
        .from("project_live")
        .select("version")
        .eq("project_id", projectId)
        .maybeSingle();
      return data?.version ?? null;
    };

    // Refreshes only if the project changed since what this tab shows.
    const catchUp = async () => {
      const version = await readVersion();
      if (!active || version === null) return;
      if (shown !== null && version !== shown) refresh();
      shown = version;
    };

    const onChange = ({ payload: row }: { payload: LiveRow }) => {
      const own =
        accountId !== null &&
        row.changed_by === accountId &&
        document.visibilityState === "visible";
      // A hidden tab keeps its old version: it refreshes when shown.
      if (document.visibilityState === "visible" && row.version)
        shown = row.version;
      if (!own && document.visibilityState === "visible") refresh();
    };

    // The project's private channel, sent by the database on each bump
    // (20261027000401_live_broadcast.sql; RLS on realtime.messages: only
    // who sees the project hears it).
    const channel = supabase
      .channel(`project:${projectId}`, { config: { private: true } })
      .on("broadcast", { event: "changed" }, onChange);

    // The session token must reach Realtime before subscribing, or the
    // private channel refuses the socket as anonymous. A new
    // subscription after the first (reconnection) may have missed changes.
    supabase.realtime
      .setAuth()
      .catch(() => undefined)
      .finally(() => {
        if (!active) return;
        channel.subscribe((status) => {
          if (status !== "SUBSCRIBED") return;
          if (subscribedOnce) void catchUp();
          subscribedOnce = true;
        });
      });
    void catchUp();

    const onVisible = () => {
      if (document.visibilityState === "visible") void catchUp();
    };
    const onOnline = () => void catchUp();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);

    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      supabase.removeChannel(channel);
    };
  }, [projectId, accountId]);

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
