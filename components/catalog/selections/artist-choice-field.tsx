"use client";

import { useMemo, useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import { CreateArtistDialog } from "@/components/catalog/create-artist-dialog";
import { SearchPicker } from "@/components/catalog/search-picker";
import { NameChip, NameChips } from "@/components/ui/name-chip";
import { RequiredMark } from "@/components/ui/required-mark";
import type { ArtistOption } from "@/lib/catalog/types";
import { artistSelections } from "@/lib/i18n/fr/artist-selections";

const fr = { artistSelections };

/**
 * Several artists of the Catalogue chosen in a form (« Nouvelle sélection »,
 * « Ajouter des artistes », lot 4 of docs/pds-mic-plan.md): the search of
 * the artist and master pickers (SearchPicker, its last row creates an
 * artist that is then chosen), and the chosen ones just under it as pills
 * with their ✕ (SearchPicker `chosen`: never under its list, on screen as
 * soon as one is picked), in the
 * order they were picked; the legend counts them (« Artistes · 3 »).
 * Controlled by the form; `excludedIds`: artists already in the selection,
 * never offered. A name that exists is never offered for creation, even an
 * excluded or chosen one: the list says so (`chosenNote`, `excludedNote`).
 * `legend` and `hint`: another use (the guests of a collective in the
 * project form).
 */
export function ArtistChoiceField({
  artists,
  excludedIds,
  value,
  onChange,
  required = false,
  error,
  openOnFocus = true,
  legend,
  hint,
  chosenNote,
  excludedNote,
}: {
  artists: ArtistOption[];
  excludedIds?: ReadonlySet<string>;
  value: ArtistOption[];
  onChange: (next: ArtistOption[]) => void;
  required?: boolean;
  error?: string;
  // SearchPicker's: `false` where the field is focused on opening a modal.
  openOnFocus?: boolean;
  legend?: string;
  hint?: string;
  // Said when the typed name is that of a chosen artist, or of an excluded one.
  chosenNote?: (name: string) => string;
  excludedNote?: (name: string) => string;
}) {
  const t = fr.artistSelections.picker;
  const [created, setCreated] = useState<ArtistOption[]>([]);
  const [dialogName, setDialogName] = useState<string | null>(null);
  const errorId = "artist-choice-error";

  // Every artist, the excluded and the chosen too: the picker needs their
  // names to refuse a homonym.
  const options = useMemo(() => {
    const known = new Set(artists.map((a) => a.id));
    return [...artists, ...created.filter((a) => !known.has(a.id))];
  }, [artists, created]);
  const chosenIds = useMemo(() => new Set(value.map((a) => a.id)), [value]);
  const hiddenIds = useMemo(
    () => new Set([...chosenIds, ...(excludedIds ?? [])]),
    [chosenIds, excludedIds],
  );

  const add = (artist: ArtistOption) =>
    onChange(chosenIds.has(artist.id) ? value : [...value, artist]);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-medium">
        {value.length > 0
          ? t.counted(legend ?? t.legend, value.length)
          : (legend ?? t.legend)}
        {required && <RequiredMark announce />}
      </legend>
      <SearchPicker
        label={t.label}
        placeholder={t.placeholder}
        options={options.map((a) => ({ id: a.id, label: a.name }))}
        excludedIds={hiddenIds}
        uniqueLabels
        excludedNote={(option) =>
          chosenIds.has(option.id)
            ? (chosenNote ?? t.alreadyChosen)(option.label)
            : (excludedNote ?? t.alreadyInSelection)(option.label)
        }
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
        chosen={
          value.length > 0 ? (
            <ul aria-label={t.chosen}>
              <NameChips>
                {value.map((artist) => (
                  <li key={artist.id} className="contents">
                    <NameChip
                      name={artist.name}
                      onRemove={() =>
                        onChange(value.filter((a) => a.id !== artist.id))
                      }
                      removeLabel={t.remove(artist.name)}
                    />
                  </li>
                ))}
              </NameChips>
            </ul>
          ) : null
        }
      />
      {error ? (
        <FieldError id={errorId}>{error}</FieldError>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
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
