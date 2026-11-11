"use client";

import { IconXmark } from "nucleo-sharp-essential";
import { useMemo, useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import { CreateArtistDialog } from "@/components/catalog/create-artist-dialog";
import { SearchPicker } from "@/components/catalog/search-picker";
import { Button } from "@/components/ui/button";
import { RequiredMark } from "@/components/ui/required-mark";
import type { ArtistOption } from "@/lib/catalog/types";
import { artistSelections } from "@/lib/i18n/fr/artist-selections";

const fr = { artistSelections };

/**
 * Several artists of the Catalogue chosen in a form (« Nouvelle sélection »,
 * « Ajouter des artistes », lot 4 of docs/pds-mic-plan.md): the search of
 * the artist and master pickers (SearchPicker, its last row creates an
 * artist that is then chosen), and the chosen ones listed above it, each
 * with its ✕, in the order they were picked. Controlled by the form;
 * `excludedIds`: artists already in the selection, never offered.
 */
export function ArtistChoiceField({
  artists,
  excludedIds,
  value,
  onChange,
  required = false,
  error,
  openOnFocus = true,
}: {
  artists: ArtistOption[];
  excludedIds?: ReadonlySet<string>;
  value: ArtistOption[];
  onChange: (next: ArtistOption[]) => void;
  required?: boolean;
  error?: string;
  // SearchPicker's: `false` where the field is focused on opening a modal.
  openOnFocus?: boolean;
}) {
  const t = fr.artistSelections.picker;
  const [created, setCreated] = useState<ArtistOption[]>([]);
  const [dialogName, setDialogName] = useState<string | null>(null);
  const errorId = "artist-choice-error";

  const options = useMemo(() => {
    const known = new Set(artists.map((a) => a.id));
    return [...artists, ...created.filter((a) => !known.has(a.id))].filter(
      (a) => !excludedIds?.has(a.id),
    );
  }, [artists, created, excludedIds]);
  const chosenIds = useMemo(() => new Set(value.map((a) => a.id)), [value]);

  const add = (artist: ArtistOption) =>
    onChange(chosenIds.has(artist.id) ? value : [...value, artist]);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-medium">
        {t.legend}
        {required && <RequiredMark announce />}
      </legend>
      {value.length > 0 && (
        <ul
          aria-label={t.chosen}
          className="flex flex-col gap-0.5 rounded-lg border border-border bg-card p-1"
        >
          {value.map((artist) => (
            <li
              key={artist.id}
              className="flex items-center gap-2 rounded-md py-1 pr-1 pl-2.5"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {artist.name}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() =>
                  onChange(value.filter((a) => a.id !== artist.id))
                }
                aria-label={t.remove(artist.name)}
              >
                <IconXmark aria-hidden className="size-5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <SearchPicker
        label={t.label}
        placeholder={t.placeholder}
        options={options.map((a) => ({ id: a.id, label: a.name }))}
        excludedIds={chosenIds}
        onPick={(id) => {
          const artist = options.find((a) => a.id === id);
          if (artist) add(artist);
        }}
        onCreate={(query) => setDialogName(query)}
        createLabel={(query) => (query ? t.createNamed(query) : t.create)}
        noResultLabel={t.noResult}
        allSelectedLabel={t.allSelected}
        invalid={Boolean(error)}
        describedBy={error ? errorId : undefined}
        openOnFocus={openOnFocus}
      />
      <FieldError id={errorId}>{error}</FieldError>
      <CreateArtistDialog
        open={dialogName !== null}
        onOpenChange={(open) => !open && setDialogName(null)}
        initialName={dialogName ?? ""}
        onCreated={(artist) => {
          setCreated((current) => [...current, artist]);
          add(artist);
        }}
      />
    </fieldset>
  );
}
