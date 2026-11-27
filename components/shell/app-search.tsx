"use client";

import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useId, useState } from "react";

import { AppSearchResults } from "@/components/shell/app-search-results";
import { SearchTrigger } from "@/components/shell/search-trigger";
import { useQuickCreate } from "@/components/shell/quick-create/quick-create-provider";
import { useAppSearch } from "@/components/shell/use-app-search";
import { useSearchRows } from "@/components/shell/use-search-rows";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { SearchField } from "@/components/ui/search-field";
import { shell } from "@/lib/i18n/fr/shell";
import type { SearchRow } from "@/lib/search/types";

const fr = { shell };

/**
 * The app's ⌘K search, at the top of the main sidebar since 24/11/2026
 * (Sacha: the top band says where one is), and in a phone's menu (no ⌘K
 * there: `shortcut`): modelled on Finance's. Nothing typed, the reader's « Créer » actions then the pages they may open; typed, the
 * projects, artists, titles, contacts, contracts, deals, calls and sessions
 * whose name matches (`appSearch`, read with the reader's session). ⌘K or
 * Ctrl K anywhere; ↑ ↓ to choose, Entrée to open.
 */
export function AppSearch({
  collapsed = false,
  shortcut = true,
  onNavigate,
}: {
  collapsed?: boolean;
  shortcut?: boolean;
  // A result chosen (a phone's menu closes).
  onNavigate?: () => void;
}) {
  const t = fr.shell.appSearch;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [byKeys, setByKeys] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const typed = useDeferredValue(query.trim());
  const { hits: found, error, pending } = useAppSearch(typed, open);
  const hits = useSearchRows(typed, found);
  const { open: openCreate } = useQuickCreate();
  const current = Math.min(active, Math.max(hits.length - 1, 0));

  useEffect(() => {
    if (!shortcut) return;
    function onKey(event: KeyboardEvent) {
      // A section's own ⌘K (Finance's) answers first and takes it.
      if (event.defaultPrevented) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setByKeys(true);
        setOpen((was) => !was);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut]);

  function go(row: SearchRow | undefined) {
    if (!row) return;
    setOpen(false);
    onNavigate?.();
    // The form is mounted by the shell's provider, out of this window, so it
    // outlives its closing.
    if (row.group === "action") openCreate(row.action);
    else router.push(row.href);
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
      <SearchTrigger
        label={t.open}
        collapsed={collapsed}
        shortcut={shortcut}
        onClick={() => changeOpen(true)}
      />
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
