"use client";

import { useDeferredValue, useState } from "react";

import { SearchField } from "@/components/ui/search-field";
import { normalizeSearch } from "@/lib/utils/search";

/**
 * A list with an instant search above it (titles, library, network): each
 * item is found by the text `searchText` gives it, case, accents and
 * separators ignored. Nothing found says so in place of the list.
 */
export function SearchableList<T>({
  items,
  searchText,
  label,
  placeholder,
  noResult,
  children,
}: {
  items: T[];
  searchText: (item: T) => (string | null | undefined)[];
  // Accessible name of the field.
  label: string;
  placeholder: string;
  noResult: (query: string) => string;
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
      <SearchField
        aria-label={label}
        placeholder={placeholder}
        maxLength={100}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {visible.length > 0 ? (
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
