"use client";

import { IconCheck, IconChevronExpandY } from "nucleo-sharp-essential";
import { useState } from "react";

import { DoneCheck } from "@/components/ui/done-check";
import { MineBadge } from "@/components/ui/mine-badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SearchableList } from "@/components/ui/searchable-list";
import { ViewLink } from "@/components/ui/view-link";
import { moduleFrame } from "@/lib/i18n/fr/module-frame";
import type { CrumbOption, ModuleCrumb } from "@/lib/ui/module-frame";
import { cn } from "@/lib/utils";

const fr = { moduleFrame };

const t = fr.moduleFrame;

// Beyond this many siblings, a search heads the list (activations,
// deliverables of a big project).
const SEARCH_FROM = 9;

const crumbText =
  "text-[color:var(--text-tertiary)] no-underline transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:text-foreground focus-visible:rounded-sm";

const chevronButton =
  "inline-flex cursor-pointer items-center rounded-md transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] outline-none hover:bg-[var(--surface-soft)] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--focus-ring)] aria-expanded:bg-[var(--surface-soft)] aria-expanded:text-foreground";

/**
 * A segment of the trail with siblings (Sacha 10/11/2026, like the
 * project's switcher): its label stays a link up to its page, a double
 * chevron after it opens the siblings — the Marketing's sub-modules, the
 * activations, the deliverables in Production — each with its line, its
 * green check and the viewer's count. On the last segment (the page itself)
 * the label and the chevron are one button. The list is given by the page:
 * nothing is read on opening.
 */
export function CrumbSwitcher({
  crumb,
  last,
}: {
  crumb: ModuleCrumb & { options: CrumbOption[] };
  last: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span className="flex min-w-0 items-center gap-0.5">
      {!last && crumb.href && (
        <ViewLink href={crumb.href} className={cn(crumbText, "truncate")}>
          {crumb.label}
        </ViewLink>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          aria-label={t.switchTo(crumb.label)}
          className={cn(
            chevronButton,
            last || !crumb.href
              ? "-ml-1.5 min-w-0 gap-1.5 px-1.5 py-0.5"
              : "size-6 shrink-0 justify-center",
            last && "text-[color:var(--text-primary)]",
          )}
        >
          {(last || !crumb.href) && (
            <span
              aria-current={last ? "page" : undefined}
              className="min-w-0 truncate"
            >
              {crumb.label}
            </span>
          )}
          <IconChevronExpandY aria-hidden className="size-3.5 shrink-0" />
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" className="w-80 gap-2 p-2">
          {crumb.options.length >= SEARCH_FROM ? (
            <SearchableList
              items={crumb.options}
              searchText={(o) => [o.label, o.detail ?? ""]}
              label={t.switcher.search}
              placeholder={t.switcher.placeholder}
              noResult={t.switcher.noResult}
            >
              {(visible) => (
                <Options options={visible} onPick={() => setOpen(false)} />
              )}
            </SearchableList>
          ) : (
            <Options options={crumb.options} onPick={() => setOpen(false)} />
          )}
        </PopoverContent>
      </Popover>
    </span>
  );
}

function Options({
  options,
  onPick,
}: {
  options: CrumbOption[];
  onPick: () => void;
}) {
  return (
    <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto overscroll-contain">
      {options.map((o) => (
        <li key={o.key}>
          {/* Prepared on intent only, like every list (page loads audit,
              27/10). */}
          <ViewLink
            href={o.href}
            onClick={onPick}
            aria-current={o.current ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-[color:var(--text-primary)] no-underline hover:bg-[var(--surface-soft)]",
              o.current && "bg-[var(--surface-sunken)]",
            )}
          >
            {o.done && <DoneCheck />}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-body-md font-medium">
                {o.label}
              </span>
              {o.detail && (
                <span className="truncate text-caption text-[color:var(--text-tertiary)]">
                  {o.detail}
                </span>
              )}
            </span>
            <MineBadge count={o.mine ?? 0} />
            {o.current && <IconCheck aria-hidden className="size-4 shrink-0" />}
          </ViewLink>
        </li>
      ))}
    </ul>
  );
}
