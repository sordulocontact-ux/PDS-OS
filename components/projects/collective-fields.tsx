"use client";

import { ArtistChoiceField } from "@/components/catalog/selections/artist-choice-field";
import { SinglePicker } from "@/components/catalog/single-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { NameChip, NameChips } from "@/components/ui/name-chip";
import type { ArtistOption } from "@/lib/catalog/types";
import { artistSelections } from "@/lib/i18n/fr/artist-selections";
import { shell } from "@/lib/i18n/fr/shell";
import {
  selectionGuests,
  type SelectionOption,
} from "@/lib/projects/collective-rules";

const fr = { shell, artistSelections };

/**
 * « Projet collectif » in the project form (lot 5 of docs/pds-mic-plan.md):
 * the option, ticked or not. `locked`: the project is collective whatever
 * happens, shown ticked and disabled, still submitted, with why: made from
 * the holder's selection (`selection`), or a collective being edited
 * (`edit`). Same row as the other options with a sentence (the Meet link of
 * a call): `Checkbox` md, its label, its sentence under it.
 */
export function CollectiveOption({
  checked,
  onChange,
  locked = null,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  locked?: "selection" | "edit" | null;
}) {
  const t = fr.shell.newProject.collective;
  return (
    <label
      htmlFor="project-collective"
      className={
        locked
          ? "flex items-start gap-3"
          : "flex cursor-pointer items-start gap-3"
      }
    >
      <Checkbox
        id="project-collective"
        size="md"
        name={locked ? undefined : "collective"}
        checked={checked}
        disabled={Boolean(locked)}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5"
      />
      {/* A disabled box is not submitted: the value travels here. */}
      {locked && <input type="hidden" name="collective" value="on" />}
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{t.label}</span>
        <span className="text-xs text-muted-foreground">
          {locked === "selection"
            ? t.fromSelection
            : locked === "edit"
              ? t.kept
              : t.hint}
        </span>
      </span>
    </label>
  );
}

/**
 * The selection of artists a collective copies (no live link): picked among
 * the selections (only the viewer's own when they convert as its holder),
 * then what it brings, said before creating: its artists but the main one,
 * each with a title without a name and a proposed participation.
 */
export function CollectiveSelectionField({
  selections,
  selectedId,
  onSelect,
  mainArtistId,
  required,
  error,
}: {
  selections: SelectionOption[];
  selectedId: string | null;
  onSelect: (selection: SelectionOption | null) => void;
  mainArtistId: string | null;
  required: boolean;
  error?: string;
}) {
  const t = fr.shell.newProject.collective;
  const selected = selections.find((s) => s.id === selectedId) ?? null;
  const preview = selected ? selectionGuests(selected, mainArtistId) : null;

  if (selections.length === 0)
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm leading-none font-medium">{t.selection}</span>
        <p className="text-xs text-muted-foreground">{t.noSelection}</p>
      </div>
    );

  return (
    <div className="flex flex-col gap-3">
      <SinglePicker
        name="selectionId"
        legend={t.selection}
        required={required}
        options={selections.map((s) => ({
          id: s.id,
          label: s.name,
          detail: `${fr.artistSelections.artistCount(s.artists.length)} · ${fr.artistSelections.holder(s.holder.name)}`,
        }))}
        selectedId={selected?.id ?? null}
        onSelect={(id) => onSelect(selections.find((s) => s.id === id) ?? null)}
        searchLabel={t.selectionSearch}
        placeholder={t.selectionPlaceholder}
        noResultLabel={t.selectionNoResult}
        allSelectedLabel={t.selectionAllSelected}
        removeLabel={t.selectionRemove}
        error={error}
      />
      {preview &&
        (preview.guests.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {preview.mainArtist
              ? t.mainInSelection(preview.mainArtist.name)
              : t.emptySelection}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <span className="text-sm leading-none font-medium">
              {t.guests(preview.guests.length)}
            </span>
            <NameChips>
              {preview.guests.map((artist) => (
                <NameChip key={artist.id} name={artist.name} />
              ))}
            </NameChips>
            {preview.mainArtist && (
              <p className="text-xs text-muted-foreground">
                {t.mainInSelection(preview.mainArtist.name)}
              </p>
            )}
          </div>
        ))}
    </div>
  );
}

/**
 * The guests of a collective named in the form (test UX du 12/11/2026: a
 * collective was created without them unless they came from a selection),
 * beside or instead of a selection: each gets a proposed participation on
 * the titles chosen that credit them (in featuring there, the main artist at
 * the head), else on a title without a name (create_collective_project,
 * Maël 26/11/2026). Never the main artist. Submitted as one JSON field
 * `guestArtistIds`.
 */
export function CollectiveGuestsField({
  artists,
  value,
  onChange,
  mainArtistId,
  error,
}: {
  artists: ArtistOption[];
  value: ArtistOption[];
  onChange: (next: ArtistOption[]) => void;
  mainArtistId: string | null;
  error?: string;
}) {
  const t = fr.shell.newProject.collective;
  const excluded = new Set(mainArtistId ? [mainArtistId] : []);
  return (
    <>
      <ArtistChoiceField
        artists={artists}
        excludedIds={excluded}
        value={value.filter((a) => a.id !== mainArtistId)}
        onChange={onChange}
        legend={t.guestsField}
        chosenNote={t.guestAlready}
        excludedNote={t.guestIsMain}
        error={error}
      />
      <input
        type="hidden"
        name="guestArtistIds"
        value={JSON.stringify(
          value.filter((a) => a.id !== mainArtistId).map((a) => a.id),
        )}
      />
    </>
  );
}
