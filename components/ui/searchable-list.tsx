"use client";

import { useDeferredValue, useState } from "react";

import { ListToolbar } from "@/components/ui/filter-bar";
import { SearchField } from "@/components/ui/search-field";
import { normalizeSearch } from "@/lib/utils/search";

/**
 * A list with an instant search above it (titles, library, network): each
 * item is found by the text `searchText` gives it, case, accents and
 * separators ignored. Nothing found says so in place of the list.
 * `filters`: the page's filters on the search's line (`UrlFilters`);
 * `empty`: what stands for a list with no item at all (filters that keep
 * nothing), under the same line so a filter can still be removed.
 */
export function SearchableList<T>({
  items,
  searchText,
  label,
  placeholder,
  noResult,
  filters,
  empty,
  autoFocus = false,
  children,
}: {
  items: T[];
  searchText: (item: T) => (string | null | undefined)[];
  // Accessible name of the field.
  label: string;
  placeholder: string;
  noResult: (query: string) => string;
  filters?: React.ReactNode;
  empty?: React.ReactNode;
  // The field takes the focus when shown (a switcher's menu, opened to
  // search).
  autoFocus?: boolean;
  children: (visible: T[]) => React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const needle = normalizeSearch(useDeferredValue(query));
  const visible = needle
    ? items.filter((item) =>
        normalizeSearch(searchText(item).filter(Boolean).join(" ")).includes(
          needle,
        ),
      )
    : items;

  return (
    <div className="flex flex-col gap-4">
      <ListToolbar
        search={
          <SearchField
            aria-label={label}
            autoFocus={autoFocus}
            placeholder={placeholder}
            maxLength={100}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        }
      >
        {filters}
      </ListToolbar>
      {items.length === 0 && empty ? (
        empty
      ) : visible.length > 0 ? (
        children(visible)
      ) : (
        <p
          role="status"
          className="py-8 text-center text-[color:var(--text-secondary)]"
        >
          {noResult(query.trim())}
        </p>
      )}
    </div>
  );
}
