"use client";

import { useMemo, useState } from "react";

import { CreateArtistDialog } from "@/components/catalog/create-artist-dialog";
import { SinglePicker } from "@/components/catalog/single-picker";
import type { ArtistOption } from "@/lib/catalog/types";
import { catalog } from "@/lib/i18n/fr/catalog";
import { shell } from "@/lib/i18n/fr/shell";

const fr = { shell, catalog };

// The artist a content project concerns, when there is one (optional). A
// music project reads its artists from its masters instead. Also the main
// artist of a collective (lot 5 of docs/pds-mic-plan.md): `name`, `legend`,
// `required`, and `onChange` for the form to follow it.
export function ProjectArtistField({
  artists,
  defaultSelectedId,
  error,
  name = "artistId",
  legend,
  searchLabel,
  required = false,
  onChange,
}: {
  artists: ArtistOption[];
  defaultSelectedId: string | null;
  error?: string;
  name?: string;
  legend?: string;
  searchLabel?: string;
  required?: boolean;
  onChange?: (id: string | null) => void;
}) {
  const t = fr.shell.newProject;
  const picker = fr.catalog.artistPicker;
  const [created, setCreated] = useState<ArtistOption[]>([]);
  const [selectedId, setSelectedIdState] = useState(defaultSelectedId);
  const [creating, setCreating] = useState<string | null>(null);
  const setSelectedId = (id: string | null) => {
    setSelectedIdState(id);
    onChange?.(id);
  };

  const options = useMemo(() => {
    const known = new Set(artists.map((a) => a.id));
    return [...artists, ...created.filter((a) => !known.has(a.id))].map(
      (a) => ({ id: a.id, label: a.name }),
    );
  }, [artists, created]);

  return (
    <>
      <SinglePicker
        name={name}
        legend={legend ?? t.fields.artist}
        required={required}
        options={options}
        selectedId={selectedId}
        onSelect={setSelectedId}
        searchLabel={searchLabel ?? t.artistField.searchLabel}
        placeholder={picker.placeholder}
        onCreate={(query) => setCreating(query)}
        // An artist of that name exists: it is listed, never created twice.
        uniqueLabels
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
