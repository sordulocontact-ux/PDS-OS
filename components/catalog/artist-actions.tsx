"use client";

import dynamic from "next/dynamic";

import { EditPanel } from "@/components/archive/edit-panel";
import { RecordActions } from "@/components/archive/record-actions";
import type { RecordRights } from "@/lib/archive/types";
import { loadArtistEdit } from "@/lib/catalog/edit-form-actions";
import { fr } from "@/lib/i18n/fr";

// Loaded when the modal opens only (picture upload, profile form).
const ArtistEditBody = dynamic(() =>
  import("@/components/catalog/artist-page/artist-edit-dialog").then(
    (m) => m.ArtistEditBody,
  ),
);

/** "⋯" of an artist: edit its profile, archive, restore or delete it. */
export function ArtistActions({
  artist,
  rights,
  leaveTo,
  size,
}: {
  artist: { id: string; name: string; masterCount: number };
  rights: RecordRights;
  leaveTo?: string;
  size?: "icon-sm" | "icon-lg";
}) {
  return (
    <RecordActions
      kind="artist"
      id={artist.id}
      name={artist.name}
      rights={rights}
      leaveTo={leaveTo}
      size={size}
      blockedReason={
        artist.masterCount > 0
          ? fr.records.archive.blocked.artistHasMasters(artist.masterCount)
          : undefined
      }
      deleteBlockedReason={
        artist.masterCount > 0
          ? fr.records.delete.blocked.artistHasMasters(artist.masterCount)
          : undefined
      }
      edit={(close) => (
        <EditPanel load={() => loadArtistEdit(artist.id)}>
          {(detail) => <ArtistEditBody artist={detail} onDone={close} />}
        </EditPanel>
      )}
    />
  );
}
