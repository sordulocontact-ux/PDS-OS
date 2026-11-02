"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { AudioPlayer } from "@/components/ui/audio-player";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePickListDone } from "@/components/ui/pick-list-context";
import { StatusBadge } from "@/components/ui/status-badge";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { decisions } from "@/lib/i18n/fr/decisions";
import { cn } from "@/lib/utils";
import { normalizeSearch } from "@/lib/utils/search";
import type { WriteResult } from "@/lib/utils/write-result";

const fr = { decisions };

const t = fr.decisions.pick;

export type PickOption = {
  id: string;
  label: string;
  // Under the name: the role, what the option is (« Studio Ressac · mix »).
  detail?: string | null;
  // A person: their picture, initials without one.
  avatar?: { pictureUrl: string | null } | null;
  // A file to listen to before choosing (versions of an audio).
  audioUrl?: string | null;
};

export type PickGroup = {
  label?: string;
  options: PickOption[];
  // Listed only once something is typed (the rest of the Réseau under the
  // engineers): a long list never buries the options that fit.
  searchOnly?: boolean;
};

/**
 * A choice in a list, saved at once (docs/VISION-UX.md rule 3, proto
 * `.opts` and `pickerModal`): groups (« Liées au projet » then « Réseau »),
 * one row per option — avatar, name in bold, its detail, a player when it
 * is a file — and « Choisir » on the right, or the pill « Choisie » for
 * the current one. `searchable`: a search field first (accents and case
 * ignored), groups without a match hidden; the list opens only when the
 * field is clicked, typed in or ↓ pressed, and closes on Échap or a click
 * elsewhere (Sacha, 30/10/2026). `footer(query)`: what to do
 * when nothing fits (« Créer un contact », « Garder seulement le nom »).
 * Once chosen, it closes the place it opened in (`PickListDoneContext`).
 */
export function PickList({
  groups,
  selectedId,
  onChoose,
  done = t.done,
  chosenLabel = t.chosen,
  searchable = false,
  searchLabel = t.search,
  searchPlaceholder = t.placeholder,
  footer,
  onDone,
}: {
  groups: PickGroup[];
  selectedId?: string | null;
  onChoose: (id: string) => Promise<WriteResult>;
  done?: string;
  chosenLabel?: string;
  searchable?: boolean;
  searchLabel?: string;
  searchPlaceholder?: string;
  footer?: (query: string) => ReactNode;
  onDone?: () => void;
}) {
  const searchId = useId();
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  // Without a search field, the list is the whole picker.
  const [listOpen, setListOpen] = useState(!searchable);
  const shownList = !searchable || listOpen;
  const closeHost = usePickListDone();
  const [query, setQuery] = useState("");
  const [choosing, setChoosing] = useState<string | null>(null);
  const { pending, error, run } = useWriteSubmit(() => {
    setChoosing(null);
    onDone?.();
    closeHost();
  }, done);

  // A click outside the picker folds the list back.
  useEffect(() => {
    if (!searchable || !listOpen) return;
    const away = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setListOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [searchable, listOpen]);

  const key = normalizeSearch(query);
  const shown = groups
    .map((group) => ({
      ...group,
      options: key
        ? group.options.filter((o) =>
            normalizeSearch(`${o.label} ${o.detail ?? ""}`).includes(key),
          )
        : group.options,
    }))
    .filter(
      (group) => group.options.length > 0 && (!group.searchOnly || key),
    );

  return (
    <div ref={root} className="flex flex-col gap-3">
      {searchable && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={searchId} className="text-body-sm font-medium">
            {searchLabel}
          </label>
          <Input
            id={searchId}
            autoFocus
            autoComplete="off"
            aria-expanded={listOpen}
            aria-controls={listId}
            value={query}
            placeholder={searchPlaceholder}
            onClick={() => setListOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setListOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setListOpen(true);
              } else if (e.key === "Escape" && listOpen) {
                // Folds the list only; the next Échap closes the host.
                e.stopPropagation();
                setListOpen(false);
              }
            }}
            className="h-10"
          />
        </div>
      )}
      <div
        id={listId}
        hidden={!shownList}
        className={cn(
          "flex flex-col overflow-auto overscroll-contain rounded-xl border border-[color:var(--border-hairline)]",
          searchable && "max-h-75",
        )}
      >
        {shown.length === 0 && (
          <p className="px-3 py-3 text-caption text-muted-foreground">
            {t.noResult(query.trim())}
          </p>
        )}
        {shown.map((group, index) => (
          <div key={group.label ?? index} role="group" aria-label={group.label}>
            {group.label && (
              <p className="px-3 pt-2.5 pb-1 text-caption text-muted-foreground">
                {group.label}
              </p>
            )}
            {group.options.map((option) => (
              <div
                key={option.id}
                className="flex min-h-12 flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-[color:var(--border-hairline)] px-3 py-2 last:border-b-0"
              >
                {option.avatar && (
                  <Avatar name={option.label} pictureUrl={option.avatar.pictureUrl} />
                )}
                <span className="flex min-w-0 flex-[1_1_12rem] flex-col">
                  <b className="text-body-sm font-semibold break-words">
                    {option.label}
                  </b>
                  {option.detail && (
                    <span className="text-caption text-muted-foreground">
                      {option.detail}
                    </span>
                  )}
                </span>
                {option.audioUrl && (
                  <AudioPlayer
                    src={option.audioUrl}
                    label={t.listen(option.label)}
                    className="w-full max-w-72 sm:w-64"
                  />
                )}
                {option.id === selectedId ? (
                  <StatusBadge tone="success" size="sm">
                    {chosenLabel}
                  </StatusBadge>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    aria-busy={(pending && choosing === option.id) || undefined}
                    aria-label={t.chooseNamed(option.label)}
                    onClick={() => {
                      setChoosing(option.id);
                      run(() => onChoose(option.id));
                    }}
                  >
                    {t.choose}
                  </Button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <FormMessage kind="error">{error}</FormMessage>
      {footer?.(query)}
    </div>
  );
}
