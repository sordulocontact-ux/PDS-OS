import "server-only";

import {
  identityFieldsOf,
  type IdentityFields,
} from "@/lib/catalog/identity-fields";
import type { Member } from "@/lib/framing/related";
import { trackedCache } from "@/lib/projects/live-deps";
import { createClient } from "@/lib/supabase/server";

// The artist's identity (MKT-C2-04): versions kept on the artist, newest
// first; the current one is the latest approved. Read like the artist (RLS:
// members of the organisation).

export type IdentityVersion = IdentityFields & {
  id: string;
  number: number;
  status: "proposed" | "approved" | "rejected";
  changeNote: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionComment: string | null;
  // The release it was proposed from, if any.
  projectId: string | null;
  // Approved versions: in force from their approval until the next one.
  validUntil: string | null;
};

export type ArtistIdentity = {
  versions: IdentityVersion[];
  current: IdentityVersion | null;
};

// Once per request: the artist's « Maintenant » (its layout) and the
// Identité tab read the same versions (`members` is itself read once).
export const loadArtistIdentity = trackedCache(readArtistIdentity);

/** The proposal « Maintenant » asks a validator to decide: the newest one
 * someone else wrote (nobody decides their own). */
export function identityToDecide(
  identity: ArtistIdentity,
  meId: string | null,
): IdentityVersion | null {
  return (
    identity.versions.find(
      (v) => v.status === "proposed" && v.createdBy !== meId,
    ) ?? null
  );
}

async function readArtistIdentity(
  artistId: string,
  members: Member[],
): Promise<ArtistIdentity> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("artist_identity_versions")
    .select(
      "id, number, status, manifesto, tone, palette, typography, symbols, refs, change_note, created_by, created_at, decided_by, decided_at, decision_comment, proposed_from_project_id",
    )
    .eq("artist_id", artistId)
    .order("number", { ascending: false });
  const name = (id: string | null) =>
    members.find((m) => m.personId === id)?.name ?? null;
  const approved = (data ?? [])
    .filter((v) => v.status === "approved" && v.decided_at)
    .sort((a, b) => (a.decided_at! < b.decided_at! ? -1 : 1));
  const versions = (data ?? []).map((v): IdentityVersion => {
    const at = approved.findIndex((x) => x.id === v.id);
    return {
      ...identityFieldsOf(v),
      id: v.id,
      number: v.number,
      status:
        v.status === "approved" || v.status === "rejected"
          ? v.status
          : "proposed",
      changeNote: v.change_note,
      createdBy: v.created_by,
      createdByName: name(v.created_by),
      createdAt: v.created_at,
      decidedByName: name(v.decided_by),
      decidedAt: v.decided_at,
      decisionComment: v.decision_comment,
      projectId: v.proposed_from_project_id,
      validUntil: at >= 0 ? (approved[at + 1]?.decided_at ?? null) : null,
    };
  });
  const last = approved.at(-1);
  return {
    versions,
    current: last ? (versions.find((v) => v.id === last.id) ?? null) : null,
  };
}
