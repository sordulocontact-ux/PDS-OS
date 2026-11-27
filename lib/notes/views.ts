// Rows of the Notes page (ticket « Calls → Calendrier + Notes », 27/11/2026):
// the calls with their content and the notes written by hand, and the tab
// each one falls in. Computed by code (rule 6), client-safe.

import { callViewOf } from "@/lib/calls/format";
import type { CallListItem } from "@/lib/calls/queries";

export type NotePerson = { personId: string; name: string };

export type CallNoteRow = {
  kind: "call";
  call: CallListItem;
  // Its latest report's summary, else the latest summary sent; cut.
  excerpt: string | null;
  // The members invited.
  people: NotePerson[];
  hasReport: boolean;
};

export type WrittenNoteRow = {
  kind: "written";
  id: string;
  title: string;
  // The beginning of its text, cut.
  excerpt: string;
  // Null: a note of the team.
  projectId: string | null;
  projectTitle: string | null;
  author: NotePerson;
  createdAt: string;
  updatedAt: string;
  // The viewer wrote it: only them changes or deletes it.
  mine: boolean;
};

export type NoteRow = CallNoteRow | WrittenNoteRow;

/** The single view a row belongs to; « todo » calls are also « calls ». */
export type NoteView = "calls" | "written" | "todo" | "upcoming";

/** Tabs of the Notes page; « upcoming » only in a project (no calendar there). */
export const NOTE_TABS = [
  "all",
  "calls",
  "written",
  "todo",
  "upcoming",
] as const;
export type NoteTab = (typeof NOTE_TABS)[number];

export function asNoteTab(value: unknown): NoteTab | null {
  return NOTE_TABS.find((tab) => tab === value) ?? null;
}

/**
 * written · upcoming: a call still to come · todo: a past call with neither
 * report nor closure · calls: any other past call.
 */
export function noteViewOf(row: NoteRow, now: Date): NoteView {
  if (row.kind === "written") return "written";
  if (callViewOf(row.call, now) === "upcoming") return "upcoming";
  return !row.hasReport && !row.call.closed ? "todo" : "calls";
}

/** Whether a row shows under a tab: « Toutes » = past calls + written notes. */
export function inNoteTab(row: NoteRow, tab: NoteTab, now: Date): boolean {
  const view = noteViewOf(row, now);
  switch (tab) {
    case "all":
      return view !== "upcoming";
    case "calls":
      return view === "calls" || view === "todo";
    default:
      return view === tab;
  }
}

/** When a row happened: a call's start, a note's last change. */
export function noteDateOf(row: NoteRow): string {
  return row.kind === "call" ? row.call.occurredAt : row.updatedAt;
}

const EXCERPT_LENGTH = 240;

/** A text on one line, cut at a word near `max` characters. */
export function excerptOf(text: string, max = EXCERPT_LENGTH): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** A written note's side sheet (NoteSheet), read when it opens: its whole text. */
export type NoteSheetData = Omit<WrittenNoteRow, "kind" | "excerpt"> & {
  body: string;
};
