"use client";

import { IconMagnifier, IconPlus } from "nucleo-sharp-essential";
import { useId, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type PickerOption = { id: string; label: string; detail?: string };

// Search field + result list (ARIA combobox), shared by the artist and master
// pickers. Picking adds to the selection kept by the parent; the last row is
// always the "create" shortcut, so a missing item never blocks the form.
// `suggestedIds`: the only options listed before anything is typed (the
// people who fit); typing searches them all. Inside a modal the list sits in
// the flow, so the modal grows instead of clipping it. `clearOnCreate`: the
// shortcut adds at once (an e-mail address), so the field empties, unless
// `onCreate` returns false (nothing added: the query stays to be fixed).
export function SearchPicker({
  label,
  placeholder,
  options,
  excludedIds,
  onPick,
  onCreate,
  createLabel,
  noResultLabel,
  allSelectedLabel,
  suggestedIds,
  noSuggestionLabel,
  invalid,
  describedBy,
  clearOnCreate = false,
}: {
  label: string;
  placeholder: string;
  options: PickerOption[];
  excludedIds: ReadonlySet<string>;
  onPick: (id: string) => void;
  onCreate: (query: string) => void | false;
  createLabel: (query: string) => string;
  noResultLabel: (query: string) => string;
  allSelectedLabel: string;
  suggestedIds?: ReadonlySet<string>;
  // Said before typing when none of the options is suggested.
  noSuggestionLabel?: string;
  invalid?: boolean;
  describedBy?: string;
  clearOnCreate?: boolean;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const available = useMemo(
    () => options.filter((o) => !excludedIds.has(o.id)),
    [options, excludedIds],
  );
  const results = useMemo(() => {
    const q = normalize(query);
    if (!q)
      return (
        suggestedIds
          ? available.filter((o) => suggestedIds.has(o.id))
          : available
      ).slice(0, 8);
    return available
      .filter((o) => normalize(`${o.label} ${o.detail ?? ""}`).includes(q))
      .slice(0, 8);
  }, [available, query, suggestedIds]);

  // Rows: results, then the create shortcut.
  const rowCount = results.length + 1;
  const activeIndex = Math.min(active, rowCount - 1);

  function pick(index: number) {
    if (index < results.length) {
      onPick(results[index].id);
      setQuery("");
      setActive(0);
    } else {
      const created = onCreate(query.trim());
      if (clearOnCreate && created !== false) {
        setQuery("");
        setActive(0);
      }
      setOpen(false);
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((activeIndex + 1) % rowCount);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActive((activeIndex - 1 + rowCount) % rowCount);
    } else if (event.key === "Enter") {
      // Never submits the surrounding form from the search field.
      event.preventDefault();
      if (open) pick(activeIndex);
      else setOpen(true);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    }
  }

  const emptyMessage =
    results.length === 0
      ? query.trim()
        ? noResultLabel(query.trim())
        : available.length === 0
          ? options.length > 0
            ? allSelectedLabel
            : null
          : (noSuggestionLabel ?? null)
      : null;

  return (
    <div className="relative flex flex-col">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <IconMagnifier
        className="pointer-events-none absolute top-3 left-3 size-[15px] text-muted-foreground"
        aria-hidden
      />
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open ? `${id}-row-${activeIndex}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        value={query}
        placeholder={placeholder}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="h-10 pl-9 text-base md:text-sm"
      />
      {open && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-border bg-popover shadow-elevation-1 in-[[data-slot=dialog-content]]:static">
          {emptyMessage && (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          )}
          <ul id={listId} role="listbox" aria-label={label} className="py-1">
            {results.map((option, index) => (
              <li
                key={option.id}
                id={`${id}-row-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                // mousedown: keep the focus in the field (blur would close).
                onMouseDown={(event) => {
                  event.preventDefault();
                  pick(index);
                }}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  "flex min-h-11 cursor-pointer flex-col justify-center px-3 py-1.5 text-sm",
                  index === activeIndex && "bg-[var(--control-bg-hover)]",
                )}
              >
                <span className="font-medium">{option.label}</span>
                {option.detail && (
                  <span className="text-xs text-muted-foreground">
                    {option.detail}
                  </span>
                )}
              </li>
            ))}
            <li
              id={`${id}-row-${results.length}`}
              role="option"
              aria-selected={activeIndex === results.length}
              onMouseDown={(event) => {
                event.preventDefault();
                pick(results.length);
              }}
              onMouseEnter={() => setActive(results.length)}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-2 border-t border-[color:var(--border-hairline)] px-3 text-sm font-medium",
                activeIndex === results.length &&
                  "bg-[var(--control-bg-hover)]",
              )}
            >
              <IconPlus className="size-4" aria-hidden />
              {createLabel(query.trim())}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
