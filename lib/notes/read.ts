import "server-only";

import { notes } from "@/lib/i18n/fr/notes";
import type { NoteLink, NotePerson } from "@/lib/notes/views";
import { personName } from "@/lib/projects/types";

// What every read of a written note selects (list, sheet): its record
// linked (20261127210101) and its author, in one request, never one per note.
// The RLS of `notes` already asks that the reader reads the linked record.
export const WRITTEN_NOTE_SELECT =
  "id, title, body, project_id, deal_id, contract_id, created_by, created_at, updated_at, project:projects!notes_project_same_org(title), deal:deals!notes_deal_same_org(artist:artists!deals_artist_same_org(name), project:projects!deals_project_same_org(title)), contract:contracts!notes_contract_same_org(title), author:people!notes_created_by_fkey(first_name, last_name)";

type LinkedRow = {
  project_id: string | null;
  deal_id: string | null;
  contract_id: string | null;
  project: { title: string } | null;
  deal: {
    artist: { name: string } | null;
    project: { title: string } | null;
  } | null;
  contract: { title: string } | null;
};

/** A deal's name: its artist, else its project; null when it has neither. */
export function dealNameOf(deal: LinkedRow["deal"]): string | null {
  return deal?.artist?.name ?? deal?.project?.title ?? null;
}

/** The record a note is linked to, with its pill's text; null: the team's. */
export function noteLinkOf(row: LinkedRow): NoteLink | null {
  if (row.project_id)
    return {
      kind: "project",
      id: row.project_id,
      label: row.project?.title ?? notes.link.kinds.project,
    };
  if (row.deal_id)
    return {
      kind: "deal",
      id: row.deal_id,
      label: notes.link.deal(dealNameOf(row.deal)),
    };
  if (row.contract_id)
    return {
      kind: "contract",
      id: row.contract_id,
      label: row.contract?.title ?? notes.link.kinds.contract,
    };
  return null;
}

export function authorOf(row: {
  created_by: string;
  author: { first_name: string | null; last_name: string | null } | null;
}): NotePerson {
  return {
    personId: row.created_by,
    name: row.author
      ? personName(row.author.first_name, row.author.last_name)
      : "",
  };
}
