"use client";

import { IconXmark } from "nucleo-sharp-essential";
import { IconArrowDown, IconArrowUp } from "@/components/icons";
import { useMemo, useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import { CreateArtistDialog } from "@/components/catalog/create-artist-dialog";
import { SearchPicker } from "@/components/catalog/search-picker";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CREDIT_ROLES,
  isCreditRole,
  type ArtistOption,
  type Credit,
} from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";

// Credits of a master: search, multiple artists, main or featuring, order.
// Submitted as one JSON field `credits`. Creating an artist from here selects
// it on return; nothing else in the form is touched.
export function ArtistPicker({
  artists,
  defaultCredits = [],
  onArtistCreated,
  error,
}: {
  artists: ArtistOption[];
  defaultCredits?: Credit[];
  onArtistCreated?: (artist: ArtistOption) => void;
  error?: string;
}) {
  const t = fr.catalog.artistPicker;
  const [created, setCreated] = useState<ArtistOption[]>([]);
  const [credits, setCredits] = useState<Credit[]>(defaultCredits);
  const [dialogName, setDialogName] = useState<string | null>(null);

  const options = useMemo(() => {
    const known = new Set(artists.map((a) => a.id));
    return [...artists, ...created.filter((a) => !known.has(a.id))];
  }, [artists, created]);
  const selectedIds = useMemo(
    () => new Set(credits.map((c) => c.artistId)),
    [credits],
  );

  function add(artist: ArtistOption) {
    setCredits((current) =>
      current.some((c) => c.artistId === artist.id)
        ? current
        : [
            ...current,
            { artistId: artist.id, name: artist.name, role: "main" },
          ],
    );
  }

  function move(index: number, delta: number) {
    setCredits((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item);
      return next;
    });
  }

  const errorId = "credits-error";

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-medium">
        {fr.catalog.masterForm.fields.artists}
      </legend>
      <input
        type="hidden"
        name="credits"
        value={JSON.stringify(
          credits.map(({ artistId, role }) => ({ artistId, role })),
        )}
      />

      {credits.length > 0 && (
        <ol
          aria-label={t.credits}
          className="flex flex-col divide-y divide-[color:var(--border-hairline)] rounded-lg border border-border"
        >
          {credits.map((credit, index) => (
            <li
              key={credit.artistId}
              className="flex flex-wrap items-center gap-2 py-1.5 pr-1.5 pl-3"
            >
              <span className="w-4 text-sm text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {credit.name}
              </span>
              <Select
                value={credit.role}
                items={Object.fromEntries(
                  CREDIT_ROLES.map((role) => [role, t.roles[role]]),
                )}
                onValueChange={(role) => {
                  if (!isCreditRole(role)) return;
                  setCredits((current) =>
                    current.map((c) =>
                      c.artistId === credit.artistId ? { ...c, role } : c,
                    ),
                  );
                }}
              >
                <SelectTrigger
                  aria-label={t.role(credit.name)}
                  className="h-9 w-32 text-sm"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CREDIT_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {t.roles[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="flex">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={t.moveUp(credit.name)}
                >
                  <IconArrowUp aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={index === credits.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={t.moveDown(credit.name)}
                >
                  <IconArrowDown aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setCredits((current) =>
                      current.filter((c) => c.artistId !== credit.artistId),
                    )
                  }
                  aria-label={t.remove(credit.name)}
                >
                  <IconXmark aria-hidden />
                </Button>
              </span>
            </li>
          ))}
        </ol>
      )}

      <SearchPicker
        label={t.searchLabel}
        placeholder={t.placeholder}
        options={options.map((a) => ({ id: a.id, label: a.name }))}
        excludedIds={selectedIds}
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
      />
      <FieldError id={errorId}>{error}</FieldError>

      <CreateArtistDialog
        open={dialogName !== null}
        onOpenChange={(open) => !open && setDialogName(null)}
        initialName={dialogName ?? ""}
        onCreated={(artist) => {
          setCreated((current) => [...current, artist]);
          onArtistCreated?.(artist);
          add(artist);
        }}
      />
    </fieldset>
  );
}
