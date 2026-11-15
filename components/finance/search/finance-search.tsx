"use client";

import { IconMagnifier } from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useId, useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { SearchField } from "@/components/ui/search-field";
import type { FinancePulse } from "@/lib/finance/search-actions";
import { financeSearch } from "@/lib/i18n/fr/finance-search";
import { FINANCE_SECTIONS } from "@/lib/ui/finance-sections";
import { normalizeSearch } from "@/lib/utils/search";

import { SearchResults, type SearchRow } from "./search-results";

const t = financeSearch;
// At most this many rows per group: the search finds, the list shows all.
const PER_GROUP = 6;

const SECTIONS: SearchRow[] = FINANCE_SECTIONS.map((s) => ({
  id: `section:${s.key}`,
  group: "section",
  label: s.label,
  detail: "",
  href: s.href,
}));

/**
 * Finance's ⌘K (docs/FINANCE-V2.md, lot 5, after Midday): one field that
 * finds a page, a budget, a spend or an invoice by its name, its amount or
 * its number, and opens it, a spend or an invoice in its side sheet. ⌘K or
 * Ctrl K from any Finance page; ↑ ↓ to choose, Entrée to open. The index is
 * read by code after the page shows (`useFinancePulse`).
 */
export function FinanceSearch({ pulse }: { pulse: FinancePulse | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [byKeys, setByKeys] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const needle = normalizeSearch(useDeferredValue(query));

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setByKeys(true);
        setOpen((was) => !was);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const rows = needle
    ? [...SECTIONS, ...(pulse?.items ?? [])].filter((row) =>
        normalizeSearch(`${row.label} ${row.detail}`).includes(needle),
      )
    : SECTIONS;
  // Empty, it lists the nine pages; typed, a few rows of each kind.
  const shown = needle
    ? (["section", "envelope", "spend", "income"] as const).flatMap((group) =>
        rows.filter((r) => r.group === group).slice(0, PER_GROUP),
      )
    : SECTIONS;
  const current = Math.min(active, Math.max(shown.length - 1, 0));

  function go(row: SearchRow | undefined) {
    if (!row) return;
    setOpen(false);
    router.push(row.href);
  }

  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setActive(0);
      setByKeys(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => changeOpen(true)}
        className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md text-left text-body-md text-[color:var(--text-tertiary)] transition-colors duration-[var(--duration-fast)] outline-none hover:text-[color:var(--text-secondary)] focus-visible:ring-2 focus-visible:ring-ring"
      >
        <IconMagnifier
          aria-hidden
          className="size-4 shrink-0 text-[color:var(--text-secondary)]"
        />
        <span className="min-w-0 truncate">{t.open}</span>
        <Kbd className="max-sm:hidden">⌘K</Kbd>
        <span className="flex-1" />
      </button>
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent
          closeLabel={t.close}
          showClose={false}
          side="center"
          instant={byKeys}
          className="finance-scope gap-3 p-3 sm:top-[12vh] sm:max-w-[560px] sm:translate-y-0"
        >
          <DialogTitle className="sr-only">{t.label}</DialogTitle>
          <SearchField
            autoFocus
            role="combobox"
            aria-label={t.label}
            aria-expanded
            aria-controls={listId}
            aria-activedescendant={
              shown[current] ? `${listId}-${current}` : undefined
            }
            placeholder={t.placeholder}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (
                (event.key === "ArrowDown" || event.key === "ArrowUp") &&
                shown.length
              ) {
                event.preventDefault();
                const step = event.key === "ArrowDown" ? 1 : -1;
                setActive((current + step + shown.length) % shown.length);
              } else if (event.key === "Enter") {
                event.preventDefault();
                go(shown[current]);
              }
            }}
          />
          <SearchResults
            id={listId}
            rows={shown}
            active={current}
            onHover={setActive}
            onPick={go}
          />
          {needle && !shown.length && (
            <p className="px-2 py-6 text-center text-body-sm text-[color:var(--text-secondary)]">
              {pulse ? t.none(query.trim()) : t.loading}
            </p>
          )}
          {pulse?.error && (
            <p className="px-2 text-caption text-[color:var(--error)]">
              {t.error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[color:var(--border-hairline)] px-2 pt-3 text-caption text-[color:var(--text-tertiary)] max-sm:hidden">
            <span className="flex items-center gap-1.5">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              {t.keys.move}
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>Entrée</Kbd>
              {t.keys.open}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
