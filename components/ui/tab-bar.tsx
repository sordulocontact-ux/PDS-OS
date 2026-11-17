"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

import { ButtonRoll } from "@/components/ui/button";
import { tabLinkClass } from "@/components/ui/tab-link";
import { scrollFadeX, useScrollFade } from "@/components/ui/use-scroll-fade";
import { ViewLink } from "@/components/ui/view-link";
import { cn } from "@/lib/utils";

// A link when the view is in the URL (shareable, Back works), a toggle
// button when the page filters in place (onSelect).
export type TabBarItem = {
  label: string;
  // Shown in grey after the label (rows of a list view).
  count?: number;
  current: boolean;
} & ({ href: string; onSelect?: never } | { href?: never; onSelect: () => void });

type Position = { x: number; width: number };

const samePlace = (a: Position | null, b: Position | null) =>
  a !== null && b !== null && a.x === b.x && a.width === b.width;

// Where each bar's indicator last stood, by bar label: a view change can
// remount the bar (new search params), and the indicator should still slide
// from the tab it leaves. Only a position left just now counts.
const lastPositions = new Map<string, Position & { at: number }>();
const REMOUNT_WINDOW_MS = 1000;

// Underlined tabs (docs/DESIGN.md § 4, « Onglets »): a hairline under the
// whole bar, and a 2 px indicator over it under the current tab, sliding from
// one tab to the next (transform only; placed at once when motion is reduced).
export function TabBar({ label, items }: { label: string; items: TabBarItem[] }) {
  const barRef = useRef<HTMLElement & HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const position = useRef<Position | null>(null);
  const active = items.findIndex((item) => item.current);

  useLayoutEffect(() => {
    const list = listRef.current;
    const indicator = indicatorRef.current;
    if (!list || !indicator) return;

    const place = (next: Position, animate: boolean) => {
      if (!animate) indicator.style.transition = "none";
      indicator.style.transform = `translateX(${next.x}px) scaleX(${next.width})`;
      if (!animate) {
        void indicator.getBoundingClientRect();
        indicator.style.transition = "";
      }
      position.current = next;
    };
    const measure = (): Position | null => {
      const link = list.children[active]?.firstElementChild;
      return link instanceof HTMLElement
        ? { x: link.offsetLeft, width: link.offsetWidth }
        : null;
    };

    const next = measure();
    if (!next) {
      indicator.style.opacity = "0";
      return;
    }
    const left = lastPositions.get(label);
    const from =
      position.current ??
      (left && performance.now() - left.at < REMOUNT_WINDOW_MS ? left : null);
    // A remount starts from the tab left just now. Nothing moves when the
    // place is unchanged: a second run of the effect (React strict mode)
    // must not cut the slide in progress.
    if (from && !samePlace(from, position.current)) place(from, false);
    if (!samePlace(next, position.current)) place(next, from !== null);
    indicator.style.opacity = "1";

    // Labels change width when the font loads or a count changes.
    // (It also fires once on observe: same place, left to the slide.)
    const observer = new ResizeObserver(() => {
      const resized = measure();
      if (resized && !samePlace(resized, position.current))
        place(resized, false);
    });
    for (const item of list.children) observer.observe(item);
    return () => {
      observer.disconnect();
      if (position.current)
        lastPositions.set(label, { ...position.current, at: performance.now() });
    };
  }, [active, label]);

  // Too narrow for every tab (UX test of 15/11/2026: « Exports » hidden at
  // the end): the current tab scrolled into view, and the edge with more
  // tabs fades out (useScrollFade).
  useScrollFade(barRef, "x");
  useEffect(() => {
    const bar = barRef.current;
    const list = listRef.current;
    if (!bar || !list) return;
    const link = list.children[active]?.firstElementChild;
    if (link instanceof HTMLElement) {
      const right = link.offsetLeft + link.offsetWidth;
      if (right > bar.scrollLeft + bar.clientWidth)
        bar.scrollLeft = right - bar.clientWidth + 16;
    }
  }, [active]);

  const Bar = items.some((item) => item.href) ? "nav" : "div";
  // The rule is an inset shadow, not a border: the indicator is drawn over it.
  return (
    <Bar
      ref={barRef}
      aria-label={label}
      role={Bar === "div" ? "group" : undefined}
      className={cn(
        "-mx-4 min-w-0 overflow-x-auto px-4 shadow-[inset_0_-1px_0_var(--border-hairline)] md:mx-0 md:px-0",
        scrollFadeX,
      )}
    >
      {/* The positioned box: tabs are measured from it. */}
      <div className="relative w-fit">
        <ul ref={listRef} className="flex gap-1">
          {items.map((item) => (
            <li key={item.href ?? item.label} className="shrink-0">
              {item.href ? (
                <ViewLink
                  href={item.href}
                  aria-current={item.current ? "page" : undefined}
                  className={tabLinkClass(item.current)}
                >
                  <TabLabel item={item} />
                </ViewLink>
              ) : (
                <button
                  type="button"
                  aria-pressed={item.current}
                  onClick={item.onSelect}
                  className={tabLinkClass(item.current)}
                >
                  <TabLabel item={item} />
                </button>
              )}
            </li>
          ))}
        </ul>
        <span
          ref={indicatorRef}
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 h-0.5 w-px origin-left bg-foreground opacity-0 transition-transform duration-[var(--duration-slide)] ease-[var(--ease-standard)] motion-reduce:transition-none"
        />
      </div>
    </Bar>
  );
}

function TabLabel({ item }: { item: TabBarItem }) {
  return (
    <ButtonRoll>
      {item.label}
      {item.count !== undefined && (
        <span className="text-muted-foreground tabular-nums">
          ({item.count})
        </span>
      )}
    </ButtonRoll>
  );
}
