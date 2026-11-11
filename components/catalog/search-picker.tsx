"use client";

import { IconMagnifier, IconPlus, IconTextTool2 } from "nucleo-sharp-essential";
import { useId, useMemo, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type PickerOption = { id: string; label: string; detail?: string };

// Search field + result list (ARIA combobox), shared by the artist and master
// pickers. Picking adds to the selection kept by the parent; the last row is
// always the "create" shortcut, so a missing item never blocks the form.
// `suggestedIds`: the only options listed before anything is typed (the
// people who fit); typing searches them all. The list floats over what is
// below (a portal popover anchored to the field, as a select's menu), so
// nothing moves while searching, and a modal never clips it (Sacha,
// 05/11/2026). The focus stays in the field. `clearOnCreate`: the
// shortcut adds at once (an e-mail address), so the field empties, unless
// `onCreate` returns false (nothing added: the query stays to be fixed).
// `keepName`: a last row once something is typed (« Garder « X » comme
// simple nom »), the way out when nobody fits, in the list where the eye
// looks for it rather than as a loose button under the field.
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
  onQueryChange,
  keepName,
  openOnFocus = true,
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
  onQueryChange?: (query: string) => void;
  keepName?: {
    label: (query: string) => string;
    onKeep: (query: string) => void;
  };
  // `false`: the list opens only once the field is clicked or typed in, not
  // when it merely takes the focus (a modal focusing it on opening, whose
  // buttons the list would cover: « Ajouter des artistes »).
  openOnFocus?: boolean;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const [query, setQueryState] = useState("");
  const setQuery = (value: string) => {
    setQueryState(value);
    onQueryChange?.(value);
  };
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const anchor = useRef<HTMLDivElement>(null);

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

  // Rows: results, the create shortcut, then « keep the name » once typed.
  const keepRow = keepName && query.trim() ? results.length + 1 : null;
  const rowCount = results.length + (keepRow === null ? 1 : 2);
  const activeIndex = Math.min(active, rowCount - 1);

  function pick(index: number) {
    if (index < results.length) {
      onPick(results[index].id);
      setQuery("");
      setActive(0);
    } else if (index === keepRow && keepName) {
      keepName.onKeep(query.trim());
      setOpen(false);
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
    <div ref={anchor} className="relative flex flex-col">
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
        onFocus={() => openOnFocus && setOpen(true)}
        // Where focus alone does not open it, a click does.
        onClick={() => !openOnFocus && setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="h-10 pl-9 text-base md:text-sm"
      />
      {/* Opened and closed by the field alone (focus, or a click without
          openOnFocus, typing, Escape, blur):
          the popover's own dismissal is ignored, so a click in the field
          never closes it. */}
      <Popover open={open} onOpenChange={() => {}}>
        <PopoverContent
          anchor={anchor}
          side="bottom"
          align="start"
          sideOffset={4}
          initialFocus={false}
          finalFocus={false}
          className="w-(--anchor-width) overflow-y-auto rounded-lg"
        >
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
            {keepRow !== null && keepName && (
              <li
                id={`${id}-row-${keepRow}`}
                role="option"
                aria-selected={activeIndex === keepRow}
                onMouseDown={(event) => {
                  event.preventDefault();
                  pick(keepRow);
                }}
                onMouseEnter={() => setActive(keepRow)}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm text-muted-foreground",
                  activeIndex === keepRow && "bg-[var(--control-bg-hover)]",
                )}
              >
                <IconTextTool2 className="size-4" aria-hidden />
                {keepName.label(query.trim())}
              </li>
            )}
          </ul>
        </PopoverContent>
      </Popover>
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
