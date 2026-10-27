"use client";

import { IconXmark } from "nucleo-sharp-essential";
import { useMemo, useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import { CreateMasterForm } from "@/components/catalog/create-master-form";
import { SearchPicker } from "@/components/catalog/search-picker";
import { Button } from "@/components/ui/button";
import { RequiredMark } from "@/components/ui/required-mark";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  masterLabel,
  type ArtistOption,
  type MasterOption,
} from "@/lib/catalog/types";
import { catalog } from "@/lib/i18n/fr/catalog";
import { shell } from "@/lib/i18n/fr/shell";

const fr = { shell, catalog };

// Masters of a project: search, add several (up to `max`: one for a single),
// remove. Submitted as one JSON field `masterIds`, in the order chosen. "Créer un master" opens step B in a
// modal and links the new master on return; the project form keeps its input.
export function MasterPicker({
  masters,
  artists,
  defaultSelectedIds,
  label = fr.shell.newProject.fields.masters,
  max,
  hint,
  error,
  required = false,
  onSelectionChange,
}: {
  masters: MasterOption[];
  artists: ArtistOption[];
  defaultSelectedIds: string[];
  label?: string;
  // Once reached, the search goes: a master is removed before another.
  max?: number;
  hint?: string;
  error?: string;
  // Shows the « * » after the legend (docs/DESIGN.md § 4).
  required?: boolean;
  // Told of each change of the titles chosen (the project's name follows a
  // single title).
  onSelectionChange?: (selected: MasterOption[]) => void;
}) {
  const t = fr.catalog.masterPicker;
  const [created, setCreated] = useState<MasterOption[]>([]);
  const [createdArtists, setCreatedArtists] = useState<ArtistOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(defaultSelectedIds);
  const [dialogOpen, setDialogOpen] = useState(false);
  // What was typed in the search: the new title's name (UX test of
  // 09/10/2026, « nom tapé non repris dans « Créer un titre » »).
  const [typed, setTyped] = useState("");

  const options = useMemo(() => {
    const known = new Set(masters.map((m) => m.id));
    return [...masters, ...created.filter((m) => !known.has(m.id))];
  }, [masters, created]);
  const byId = useMemo(() => new Map(options.map((m) => [m.id, m])), [options]);
  const selected = selectedIds.flatMap((id) => byId.get(id) ?? []);
  const excluded = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allArtists = useMemo(() => {
    const known = new Set(artists.map((a) => a.id));
    return [...artists, ...createdArtists.filter((a) => !known.has(a.id))];
  }, [artists, createdArtists]);

  const select = (next: string[], known = byId) => {
    setSelectedIds(next);
    onSelectionChange?.(next.flatMap((id) => known.get(id) ?? []));
  };
  const add = (id: string, known = byId) => {
    if (!selectedIds.includes(id)) select([...selectedIds, id], known);
  };

  const errorId = "masterIds-error";
  const hintId = "masterIds-hint";

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-medium">
        {label}
        {required && <RequiredMark announce />}
      </legend>
      <input
        type="hidden"
        name="masterIds"
        value={JSON.stringify(selected.map((m) => m.id))}
      />

      {selected.length > 0 && (
        <ul
          aria-label={t.linked}
          className="flex flex-col divide-y divide-[color:var(--border-hairline)] rounded-lg border border-border"
        >
          {selected.map((master) => (
            <li
              key={master.id}
              className="flex items-center gap-2 py-1.5 pr-1.5 pl-3"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">
                  {masterLabel(master)}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {master.artists}
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() =>
                  select(selectedIds.filter((id) => id !== master.id))
                }
                aria-label={t.remove(masterLabel(master))}
              >
                <IconXmark aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {(max === undefined || selected.length < max) && (
        <SearchPicker
          label={t.searchLabel}
          placeholder={t.placeholder}
          options={options.map((m) => ({
            id: m.id,
            label: masterLabel(m),
            detail: m.artists,
          }))}
          excludedIds={excluded}
          onPick={(id) => add(id)}
          onCreate={(query) => {
            setTyped(query);
            setDialogOpen(true);
          }}
          createLabel={(query) => (query ? t.createNamed(query) : t.create)}
          noResultLabel={t.noResult}
          allSelectedLabel={t.allSelected}
          invalid={Boolean(error)}
          describedBy={error ? errorId : hint ? hintId : undefined}
        />
      )}
      {error ? (
        <FieldError id={errorId}>{error}</FieldError>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent closeLabel={fr.catalog.artistForm.close}>
          <DialogHeader>
            <DialogTitle>{fr.catalog.masterForm.title}</DialogTitle>
            <DialogDescription>{t.createDialogDescription}</DialogDescription>
          </DialogHeader>
          {dialogOpen && (
            <CreateMasterForm
              artists={allArtists}
              defaults={{ title: typed }}
              onArtistCreated={(artist) =>
                setCreatedArtists((current) => [...current, artist])
              }
              onCancel={() => setDialogOpen(false)}
              onCreated={(master) => {
                setCreated((current) => [...current, master]);
                add(master.id, new Map(byId).set(master.id, master));
                setDialogOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </fieldset>
  );
}
