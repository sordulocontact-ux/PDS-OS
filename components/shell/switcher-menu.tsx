"use client";

import { IconCheck, IconChevronExpandY } from "nucleo-sharp-essential";
import Link from "next/link";
import { useState } from "react";

import { Loaded } from "@/components/ui/loaded";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SearchableList } from "@/components/ui/searchable-list";
import { ViewLink } from "@/components/ui/view-link";
import type { SwitcherItem } from "@/lib/shell/switcher";
import { cn } from "@/lib/utils";

const TRIGGER = {
  // Top of a context sidebar (a project's).
  nav: "flex h-10 w-full min-w-0 cursor-pointer items-center gap-2 rounded-lg px-2 text-left text-body-md font-semibold text-[color:var(--nav-fg)] transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--nav-item-hover-bg)] aria-expanded:bg-[var(--nav-item-active-bg)]",
  // A page's top band, after its section (TopbarCrumb).
  bar: "flex h-8 min-w-0 cursor-pointer items-center gap-1.5 rounded-md px-2 text-left text-body-md font-medium text-[color:var(--text-primary)] transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--control-bg-hover)] aria-expanded:bg-[var(--control-bg-hover)]",
} as const;

/**
 * A record's name with a double chevron, opening the others of its kind to
 * switch to, with a search (Figma "PDS OS", node 47:12056, as Vercel and
 * Supabase do): the project switcher of a project's sidebar and the switcher
 * of a record's top band (RecordSwitcher). The list is read when it opens;
 * the current one is ticked; « Tous les … » leads to the list.
 */
export function SwitcherMenu({
  name,
  currentId,
  load,
  variant,
  labels,
  allHref,
}: {
  name: string;
  currentId: string;
  load: () => Promise<SwitcherItem[]>;
  variant: keyof typeof TRIGGER;
  labels: {
    open: string;
    search: string;
    placeholder: string;
    noResult: (query: string) => string;
    loading: string;
    error: string;
    all: string;
  };
  allHref: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger aria-label={labels.open} className={TRIGGER[variant]}>
        <span className="min-w-0 flex-1 truncate" title={name}>
          {name}
        </span>
        <IconChevronExpandY aria-hidden className="size-4 shrink-0" />
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-80 gap-2 p-2">
        <Loaded
          load={load}
          loadingLabel={labels.loading}
          errorLabel={labels.error}
        >
          {(items) => (
            <SearchableList
              items={items}
              searchText={(item) => [item.label, item.detail]}
              label={labels.search}
              placeholder={labels.placeholder}
              noResult={labels.noResult}
              autoFocus
            >
              {(visible) => (
                <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto overscroll-contain">
                  {visible.map((item) => {
                    const current = item.id === currentId;
                    return (
                      <li key={item.id}>
                        {/* Prepared on intent: an open list must not render
                            every page at once (page loads audit, 27/10). */}
                        <ViewLink
                          href={item.href}
                          onClick={() => setOpen(false)}
                          aria-current={current ? "page" : undefined}
                          className={cn(
                            "flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 no-underline hover:bg-[var(--nav-item-hover-bg)]",
                            current && "bg-[var(--nav-item-active-bg)]",
                          )}
                        >
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-body-md font-medium">
                              {item.label}
                            </span>
                            {item.detail && (
                              <span className="truncate text-caption text-[color:var(--nav-fg-muted)]">
                                {item.detail}
                              </span>
                            )}
                          </span>
                          {current && (
                            <IconCheck
                              aria-hidden
                              className="size-4 shrink-0"
                            />
                          )}
                        </ViewLink>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SearchableList>
          )}
        </Loaded>
        <div className="border-t border-[color:var(--nav-border)] pt-2">
          <Link
            href={allHref}
            onClick={() => setOpen(false)}
            className="flex h-10 items-center rounded-lg px-3 text-body-md font-medium no-underline hover:bg-[var(--nav-item-hover-bg)]"
          >
            {labels.all}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
