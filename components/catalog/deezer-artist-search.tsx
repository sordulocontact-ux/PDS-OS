"use client";

import { IconMagnifier } from "nucleo-sharp-essential";
import { useEffect, useId, useState } from "react";

import { DeezerArtistRow } from "@/components/catalog/deezer-artist-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ArtistOption, DeezerArtistResult } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";

type Search =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; query: string; results: DeezerArtistResult[] }
  | { status: "error" };

const MIN_QUERY = 2;
const DEBOUNCE_MS = 300;

// First step of "Nouvel artiste": find the artist on Deezer. An artist the
// catalog already holds is offered as is (select it, or open its page), and
// "Créer sans Deezer" covers artists not on the platforms yet.
export function DeezerArtistSearch({
  initialQuery,
  pickerMode,
  onChoose,
  onExisting,
  onManual,
  onCancel,
}: {
  initialQuery: string;
  pickerMode: boolean;
  onChoose: (artist: DeezerArtistResult) => void;
  onExisting: (artist: ArtistOption) => void;
  onManual: (query: string) => void;
  onCancel: () => void;
}) {
  const t = fr.catalog.artistForm.deezer;
  const id = useId();
  const [query, setQuery] = useState(initialQuery);
  const [search, setSearch] = useState<Search>({ status: "idle" });
  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < MIN_QUERY) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearch({ status: "loading" });
      try {
        const response = await fetch(
          `/api/catalog/artist-search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error(`http_${response.status}`);
        const body = (await response.json()) as {
          results: DeezerArtistResult[];
        };
        setSearch({ status: "done", query: trimmed, results: body.results });
      } catch {
        if (!controller.signal.aborted) setSearch({ status: "error" });
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  // Below two letters, whatever was last found no longer applies.
  const shown: Search =
    trimmed.length < MIN_QUERY ? { status: "idle" } : search;
  const message =
    shown.status === "idle"
      ? t.hint
      : shown.status === "loading"
        ? t.searching
        : shown.status === "error"
          ? t.unavailable
          : shown.results.length === 0
            ? t.noResult(shown.query)
            : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-medium">
          {t.label}
        </label>
        <div className="relative">
          <IconMagnifier
            className="pointer-events-none absolute top-3 left-3 size-[15px] text-muted-foreground"
            aria-hidden
          />
          <Input
            id={id}
            type="search"
            autoFocus
            autoComplete="off"
            maxLength={100}
            value={query}
            placeholder={t.placeholder}
            onChange={(event) => setQuery(event.target.value)}
            className="h-10 pl-9 text-base md:text-sm"
          />
        </div>
      </div>

      {shown.status === "done" && shown.results.length > 0 && (
        <ul
          aria-label={t.resultsLabel}
          className="max-h-[min(22rem,50vh)] divide-y divide-[color:var(--border-hairline)] overflow-y-auto rounded-xl border border-border"
        >
          {shown.results.map((artist) => (
            <li key={artist.deezerId}>
              <DeezerArtistRow
                artist={artist}
                pickerMode={pickerMode}
                onChoose={onChoose}
                onExisting={onExisting}
              />
            </li>
          ))}
        </ul>
      )}

      <p
        aria-live="polite"
        className={message ? "text-sm text-muted-foreground" : "sr-only"}
      >
        {message ??
          (shown.status === "done" ? t.resultCount(shown.results.length) : "")}
      </p>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          {fr.catalog.artistForm.cancel}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => onManual(trimmed)}
        >
          {t.manual}
        </Button>
      </div>
    </div>
  );
}
