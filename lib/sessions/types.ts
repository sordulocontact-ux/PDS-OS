// Sessions studio (docs/ARCHITECTURE.md § 2 sexies bis): one session, seen
// from each artist, project and title it concerns. Client-safe.

import type { DemoStatus } from "@/lib/catalog/demo-rules";
import type { SessionKind } from "@/lib/catalog/master/rules";
import type { SessionState } from "@/lib/sessions/state";

export type SessionRef = { id: string; name: string };

export type SessionTitle = {
  id: string;
  title: string;
  // Null: an official master.
  demoStatus: DemoStatus | null;
};

export type StudioSessionRow = {
  id: string;
  kind: SessionKind;
  // Computed (lib/sessions/state.ts): Prévue, En cours, Compte rendu à
  // compléter, Terminée, Annulée.
  state: SessionState;
  date: string | null;
  startsAt: string | null;
  endsAt: string | null;
  studio: string | null;
  engineer: string | null;
  artists: SessionRef[];
  projects: SessionRef[];
  titles: SessionTitle[];
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
  // The projects it names itself (the form edits them), without those that
  // come with its titles.
  linkedProjectIds: string[];
  engineerContactId: string | null;
  notes: string | null;
  attendees: SessionAttendee[];
  links: SessionLink[];
  // The report: a free summary, then « À retenir » and « Prochaine étape ».
  reportNotes: string | null;
  reportTakeaways: string | null;
  reportNextStep: string | null;
  reportedAt: string | null;
  reportedBy: string | null;
};
