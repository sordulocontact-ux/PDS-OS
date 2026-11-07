import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { formatDay } from "@/lib/assistant/facts";
import {
  capped,
  readFailed,
  type ReadResult,
} from "@/lib/assistant/read/target";
import type { Access } from "@/lib/auth/access";
import { assistantReadPilot } from "@/lib/i18n/fr/assistant-read-pilot";
import { loadNotifications } from "@/lib/notifications/queries";
import {
  addDays,
  clock,
  parisPlace,
  weekStartOf,
} from "@/lib/utils/calendar-period";

const fr = { assistantReadPilot };
const SINCE = ["today", "yesterday", "this_week", "all"] as const;
type Since = (typeof SINCE)[number];
const MAX_SHOWN = 20;

/** The first Paris day kept, from today as read by code. */
function fromDay(since: Since, today: string): string {
  if (since === "today") return today;
  if (since === "yesterday") return addDays(today, -1);
  if (since === "this_week") return weekStartOf(today);
  return "0000-00-00";
}

/** The user's notifications as the bell words them, unread first. */
export async function readNotifications(since: Since): Promise<ReadResult> {
  const t = fr.assistantReadPilot.notifications;
  const today = parisPlace(new Date()).day;
  const { items, unreadCount } = await loadNotifications(50);
  const from = fromDay(since, today);
  const kept = items
    .filter((n) => parisPlace(new Date(n.createdAt)).day >= from)
    // Stable sort: unread first, each group newest first as loaded.
    .sort((a, b) => Number(a.read) - Number(b.read));
  const shown = kept.slice(0, MAX_SHOWN);
  return {
    facts: [
      t.window(t.since[since]),
      t.unread(unreadCount),
      ...(shown.length === 0 ? [t.empty] : []),
      ...shown.map((n) =>
        t.line(
          formatDay(n.createdAt),
          clock(parisPlace(new Date(n.createdAt)).minute),
          n.text,
          !n.read,
        ),
      ),
      ...capped(kept.length, MAX_SHOWN),
      ...(items.length >= 50 ? [t.partial] : []),
    ],
    sources: shown.map((n) => ({ label: n.text, href: n.href })),
  };
}

// The session decides what is read (RLS); `access` is kept for a uniform call.
export function notificationsTool(access: Access) {
  void access;
  return tool({
    description:
      "Lit les notifications de l'utilisateur (celles de la cloche), non lues d'abord, avec leur libellé, leur date et leur lien. À appeler pour « qu'est-ce qui s'est passé depuis hier ? », « ai-je des notifications ? ».",
    inputSchema: z.object({
      since: z
        .enum(SINCE)
        .optional()
        .describe("today, yesterday (par défaut), this_week ou all"),
    }),
    execute: async ({ since }) => {
      try {
        return await readNotifications(since ?? "yesterday");
      } catch (error) {
        console.error("readNotifications:", error);
        return readFailed();
      }
    },
  });
}
