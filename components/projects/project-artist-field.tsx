"use client";

import { useMemo, useState } from "react";

import { CreateArtistDialog } from "@/components/catalog/create-artist-dialog";
import { SinglePicker } from "@/components/catalog/single-picker";
import type { ArtistOption } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";

// The artist a content project concerns, when there is one (optional). A
// music project reads its artists from its masters instead.
export function ProjectArtistField({
  artists,
  defaultSelectedId,
  error,
}: {
  artists: ArtistOption[];
  defaultSelectedId: string | null;
  error?: string;
}) {
  const t = fr.shell.newProject;
  const picker = fr.catalog.artistPicker;
  const [created, setCreated] = useState<ArtistOption[]>([]);
  const [selectedId, setSelectedId] = useState(defaultSelectedId);
  const [creating, setCreating] = useState<string | null>(null);

  const options = useMemo(() => {
    const known = new Set(artists.map((a) => a.id));
    return [...artists, ...created.filter((a) => !known.has(a.id))].map(
      (a) => ({ id: a.id, label: a.name }),
    );
  }, [artists, created]);

  return (
    <>
      <SinglePicker
        name="artistId"
        legend={t.fields.artist}
        options={options}
        selectedId={selectedId}
        onSelect={setSelectedId}
        searchLabel={t.artistField.searchLabel}
        placeholder={picker.placeholder}
        onCreate={(query) => setCreating(query)}
        createLabel={(query) =>
          query ? picker.createNamed(query) : picker.create
        }
        noResultLabel={picker.noResult}
        allSelectedLabel={picker.allSelected}
        removeLabel={t.artistField.remove}
        error={error}
      />
      <CreateArtistDialog
        open={creating !== null}
        onOpenChange={(open) => !open && setCreating(null)}
        initialName={creating ?? ""}
        onCreated={(artist) => {
          setCreated((current) => [...current, artist]);
          setSelectedId(artist.id);
          setCreating(null);
        }}
      />
    </>
  );
}
