// Sessions studio (docs/ARCHITECTURE.md § 2 sexies bis): one session, seen
// from each artist, project and title it concerns. Client-safe.

import type { DemoStatus } from "@/lib/catalog/demo-rules";
import type { SessionKind, SessionStatus } from "@/lib/catalog/master/rules";

export type SessionRef = { id: string; name: string };

export type SessionTitle = {
  id: string;
  title: string;
  // Null: an official master.
  demoStatus: DemoStatus | null;
};

/**
 * Where the report stands, computed (never stored): written; to write (the
 * session took place); later (planned, not held yet); none (cancelled).
 */
export type SessionReportState = "done" | "todo" | "later" | "cancelled";

export type StudioSessionRow = {
  id: string;
  kind: SessionKind;
  status: SessionStatus;
  date: string | null;
  startsAt: string | null;
  endsAt: string | null;
  studio: string | null;
  engineer: string | null;
  artists: SessionRef[];
  projects: SessionRef[];
  titles: SessionTitle[];
  report: SessionReportState;
  // Who writes the report: the project manager of its first project, else
  // whoever created the session (Ibé, 05/11/2026).
  responsible: {
    personId: string;
    name: string;
    why: "owner" | "creator";
  } | null;
};

export type SessionAttendee = {
  // "m:<person id>" for a member, "c:<contact id>" for a Réseau contact.
  key: string;
  name: string;
  external: boolean;
};

export type SessionLink = { id: string; label: string; url: string };

export type StudioSession = StudioSessionRow & {
  engineerContactId: string | null;
  notes: string | null;
  attendees: SessionAttendee[];
  links: SessionLink[];
  reportNotes: string | null;
  reportedAt: string | null;
  reportedBy: string | null;
};

/** Upcoming: planned and not past; past: held or gone by; all. */
export const SESSION_VIEWS = ["upcoming", "past", "all"] as const;
export type SessionView = (typeof SESSION_VIEWS)[number];

export function sessionViewOf(value: unknown): SessionView {
  return (SESSION_VIEWS as readonly unknown[]).includes(value)
    ? (value as SessionView)
    : "upcoming";
}

export function inSessionView(
  session: Pick<StudioSessionRow, "status" | "date">,
  view: SessionView,
  today: string,
): boolean {
  if (view === "all") return true;
  const upcoming =
    session.status === "planned" && (!session.date || session.date >= today);
  return view === "upcoming" ? upcoming : !upcoming;
}

/** The report's state, from the session's status and date. */
export function reportStateOf(
  session: { status: SessionStatus; date: string | null; reported: boolean },
  today: string,
): SessionReportState {
  if (session.reported) return "done";
  if (session.status === "cancelled") return "cancelled";
  if (session.status === "done") return "todo";
  return session.date && session.date < today ? "todo" : "later";
}
