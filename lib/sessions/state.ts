// A studio session's state (retour d'Ibé du 06/11/2026, « Refonte du module
// Sessions studio »): never typed, computed from its date, its hours and its
// report; only « Annulée » is stored (status = 'cancelled'). Client-safe:
// the Sessions studio list and the title's sessions read it the same way.

import type { SessionStatus } from "@/lib/catalog/master/rules";

export const SESSION_STATES = [
  "planned",
  "ongoing",
  "toReport",
  "done",
  "cancelled",
] as const;
export type SessionState = (typeof SESSION_STATES)[number];

/** Today and the time of day in Paris ("YYYY-MM-DD", "HH:MM"). */
export type ParisNow = { today: string; time: string };

/**
 * Prévue before it starts, En cours while it lasts (the whole day when it has
 * no hours), Compte rendu à compléter once it is over, Terminée once its
 * report is written. Without a date: still to be fixed (Prévue), unless it
 * was told as held from a title (status 'done').
 */
export function sessionStateOf(
  session: {
    status: SessionStatus;
    date: string | null;
    startsAt: string | null;
    endsAt: string | null;
    reported: boolean;
  },
  now: ParisNow,
): SessionState {
  if (session.status === "cancelled") return "cancelled";
  if (session.reported) return "done";
  if (!session.date) return session.status === "done" ? "toReport" : "planned";
  if (session.date > now.today) return "planned";
  if (session.date < now.today) return "toReport";
  if (session.startsAt && now.time < session.startsAt) return "planned";
  if (session.endsAt && now.time >= session.endsAt) return "toReport";
  return "ongoing";
}

/** The list's tabs: À venir (planned or under way), À compléter, Terminées,
 * Toutes (the cancelled ones only there). */
export const SESSION_VIEWS = ["upcoming", "toReport", "done", "all"] as const;
export type SessionView = (typeof SESSION_VIEWS)[number];

export function sessionViewOf(value: unknown): SessionView {
  return (SESSION_VIEWS as readonly unknown[]).includes(value)
    ? (value as SessionView)
    : "upcoming";
}

export function inSessionView(state: SessionState, view: SessionView): boolean {
  if (view === "all") return true;
  if (view === "upcoming") return state === "planned" || state === "ongoing";
  return state === view;
}
