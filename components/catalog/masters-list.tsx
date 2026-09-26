"use client";

import { useDeferredValue, useState } from "react";

import { MastersTable } from "@/components/catalog/masters-table";
import { SearchField } from "@/components/ui/search-field";
import type { MasterRow } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";

// Masters list with an instant search on title, version, artists and ISRC.
export function MastersList({ masters }: { masters: MasterRow[] }) {
  const t = fr.catalog.masters.search;
  const [query, setQuery] = useState("");
  const needle = normalize(useDeferredValue(query));
  const visible = needle
    ? masters.filter((m) =>
        normalize(
          [m.title, m.version, m.artists, m.isrc].filter(Boolean).join(" "),
        ).includes(needle),
      )
    : masters;

  return (
    <div className="flex flex-col gap-4">
      <SearchField
        aria-label={t.label}
        placeholder={t.placeholder}
        maxLength={100}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {visible.length > 0 ? (
        <MastersTable masters={visible} />
      ) : (
        <p
          role="status"
          className="py-8 text-center text-[color:var(--text-secondary)]"
        >
          {t.noResult(query.trim())}
        </p>
      )}
    </div>
  );
}

// Case, accents and ISRC separators do not matter ("fr-xxx" finds "FRXXX…").
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[\s-]+/g, "");
}
