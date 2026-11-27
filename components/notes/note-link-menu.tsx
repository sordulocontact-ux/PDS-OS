"use client";

import {
  IconChevronLeft,
  IconChevronRight,
  IconLink,
} from "nucleo-sharp-essential";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SearchField } from "@/components/ui/search-field";
import { notes } from "@/lib/i18n/fr/notes";
import type { NoteLinkChoices } from "@/lib/notes/options";
import {
  NOTE_LINK_KINDS,
  type NoteLink,
  type NoteLinkKind,
} from "@/lib/notes/views";
import { columnIcons } from "@/lib/ui/column-icons";
import { cn } from "@/lib/utils";
import { normalizeSearch } from "@/lib/utils/search";

const fr = { notes };

// One line of the menu: a kind of record, or a record.
const ROW =
  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left outline-none hover:bg-accent focus-visible:bg-accent disabled:pointer-events-none disabled:opacity-50";

/**
 * « Lier à un projet, un deal ou un contrat » of a note's document (after
 * Accordee): the kinds of record with how many the viewer reads and « › »
 * (greyed at 0); a kind opens its records with a search; choosing one links
 * the note to it and closes the menu. `choices`: null while they load.
 */
export function NoteLinkMenu({
  choices,
  onPick,
}: {
  choices: NoteLinkChoices | null;
  onPick: (link: NoteLink) => void;
}) {
  const t = fr.notes.link;
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<NoteLinkKind | null>(null);
  const [query, setQuery] = useState("");
  const reset = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setKind(null);
      setQuery("");
    }
  };

  return (
    <Popover open={open} onOpenChange={reset}>
      <PopoverTrigger
        render={<Button variant="secondary" size="sm" className="self-start" />}
      >
        <IconLink aria-hidden />
        {t.add}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-1" aria-label={t.menu}>
        {kind === null ? (
          <>
            <p className="px-2 pt-1.5 pb-1 text-caption text-[color:var(--text-tertiary)]">
              {t.menu}
            </p>
            {NOTE_LINK_KINDS.map((each) => {
              const Icon = columnIcons[each];
              const count = choices?.[each].length;
              return (
                <button
                  key={each}
                  type="button"
                  className={ROW}
                  disabled={!count}
                  onClick={() => setKind(each)}
                >
                  <Icon
                    aria-hidden
                    className="size-4 shrink-0 text-[color:var(--text-secondary)]"
                  />
                  <span className="flex-1">{t.groups[each]}</span>
                  <span className="text-[color:var(--text-tertiary)] tabular-nums">
                    {count ?? t.loading}
                  </span>
                  <IconChevronRight
                    aria-hidden
                    className="size-3.5 shrink-0 text-[color:var(--text-tertiary)]"
                  />
                </button>
              );
            })}
          </>
        ) : (
          <RecordList
            kind={kind}
            choices={choices}
            query={query}
            onQuery={setQuery}
            onBack={() => {
              setKind(null);
              setQuery("");
            }}
            onPick={(link) => {
              onPick(link);
              reset(false);
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

function RecordList({
  kind,
  choices,
  query,
  onQuery,
  onBack,
  onPick,
}: {
  kind: NoteLinkKind;
  choices: NoteLinkChoices | null;
  query: string;
  onQuery: (query: string) => void;
  onBack: () => void;
  onPick: (link: NoteLink) => void;
}) {
  const t = fr.notes.link;
  const wanted = normalizeSearch(query);
  const shown = (choices?.[kind] ?? []).filter((option) =>
    normalizeSearch(option.name).includes(wanted),
  );
  return (
    <div className="flex min-h-0 flex-col gap-1">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" onClick={onBack}>
          <IconChevronLeft aria-hidden />
          <span className="sr-only">{t.back}</span>
        </Button>
        <span className="font-medium">{t.groups[kind]}</span>
      </div>
      <SearchField
        autoFocus
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        aria-label={t.search[kind]}
        placeholder={t.search[kind]}
        className="mx-1"
      />
      <div className="max-h-64 overflow-y-auto">
        {shown.length === 0 ? (
          <p className="px-2 py-1.5 text-caption text-[color:var(--text-tertiary)]">
            {t.none}
          </p>
        ) : (
          shown.map((option) => (
            <button
              key={option.id}
              type="button"
              className={cn(ROW, "min-w-0")}
              onClick={() =>
                onPick({ kind, id: option.id, label: option.label })
              }
            >
              <span className="min-w-0 flex-1 truncate">{option.name}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
