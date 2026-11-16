"use client";

import { IconMagnifier } from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useId, useState } from "react";

import { AppSearchResults } from "@/components/shell/app-search-results";
import { useAppSearch } from "@/components/shell/use-app-search";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { SearchField } from "@/components/ui/search-field";
import { shell } from "@/lib/i18n/fr/shell";
import type { SearchHit } from "@/lib/search/types";

const fr = { shell };

/**
 * The app's ⌘K search, in the top band of every section outside a project
 * (SectionTopbar, docs/STYLE-FINANCE-PARTOUT.md § 5.1): modelled on
 * Finance's. Nothing typed, the pages the reader may open; typed, the
 * projects, artists, titles, contacts, contracts, deals, calls and sessions
 * whose name matches (`appSearch`, read with the reader's session). ⌘K or
 * Ctrl K anywhere; ↑ ↓ to choose, Entrée to open.
 */
export function AppSearch() {
  const t = fr.shell.appSearch;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [byKeys, setByKeys] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const typed = useDeferredValue(query.trim());
  const { hits, error, pending } = useAppSearch(typed, open);
  const current = Math.min(active, Math.max(hits.length - 1, 0));

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

  function go(row: SearchHit | undefined) {
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
          className="gap-3 p-3 sm:top-[12vh] sm:max-w-[560px] sm:translate-y-0"
        >
          <DialogTitle className="sr-only">{t.label}</DialogTitle>
          <SearchField
            autoFocus
            role="combobox"
            aria-label={t.label}
            aria-expanded
            aria-controls={listId}
            aria-activedescendant={
              hits[current] ? `${listId}-${current}` : undefined
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
                hits.length
              ) {
                event.preventDefault();
                const step = event.key === "ArrowDown" ? 1 : -1;
                setActive((current + step + hits.length) % hits.length);
              } else if (event.key === "Enter") {
                event.preventDefault();
                go(hits[current]);
              }
            }}
          />
          <AppSearchResults
            id={listId}
            rows={hits}
            active={current}
            onHover={setActive}
            onPick={go}
          />
          {typed && !hits.length && (
            <p className="px-2 py-6 text-center text-body-sm text-[color:var(--text-secondary)]">
              {pending ? t.loading : t.none(typed)}
            </p>
          )}
          {error && (
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
