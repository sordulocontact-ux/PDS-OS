"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { ToastCard, type ToastPlace } from "@/components/ui/toast-card";
import {
  readNoToasts,
  readToasts,
  subscribeToasts,
  TOASTS_VISIBLE,
  type ToastItem,
} from "@/components/ui/toast";
import { core } from "@/lib/i18n/fr/core";

const fr = { core };
// Must match --toast-gap and --toast-peek (app/globals.css).
const GAP = 8;
const PEEK = 10;

/**
 * Where each toast sits. Collapsed, the newest is in front and the others
 * peek 10 px above it, smaller, cut to its height; hovered or focused, the
 * stack opens into a column. Only transform, opacity and clip-path move.
 */
function place(
  items: ToastItem[],
  heights: Record<string, number>,
  expanded: boolean,
) {
  const live = items.filter((item) => !item.exit);
  const front = live[0] ? (heights[live[0].id] ?? 0) : 0;
  const places: Record<string, ToastPlace> = {};
  let rank = 0;
  let offset = 0;
  items.forEach((item, position) => {
    const height = heights[item.id] ?? 0;
    const index = rank;
    // The newest is drawn above the others.
    const z = items.length - position;
    if (expanded || index === 0) {
      places[item.id] = { index, z, y: -offset, scale: 1, cut: 0, folded: false };
    } else {
      places[item.id] = {
        index,
        z,
        y: -(PEEK * index + Math.max(0, front - height)),
        scale: 1 - 0.05 * index,
        cut: Math.max(0, height - front),
        folded: true,
      };
    }
    if (!item.exit) {
      rank += 1;
      offset += height + GAP;
    }
  });
  const shown = Math.min(live.length, TOASTS_VISIBLE);
  const height =
    shown === 0
      ? 0
      : expanded
        ? offset - GAP
        : front + PEEK * (shown - 1);
  return { places, height };
}

/** The toasts of the app, bottom right. Mounted once, in the root layout. */
export function Toaster() {
  const items = useSyncExternalStore(subscribeToasts, readToasts, readNoToasts);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);

  // A hidden tab does not count down: nothing is missed while away.
  useEffect(() => {
    const sync = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  // `null`: the toast is gone, its height is forgotten.
  const measure = useCallback((id: string, height: number | null) => {
    setHeights((current) => {
      if (height === null) {
        if (!(id in current)) return current;
        const rest = { ...current };
        delete rest[id];
        return rest;
      }
      return current[id] === height ? current : { ...current, [id]: height };
    });
  }, []);

  const expanded = (hovered || focused) && items.some((item) => !item.exit);
  const { places, height } = place(items, heights, expanded);

  return (
    <section aria-label={fr.core.toast.region} className="toaster">
      <ol
        className="toaster-list"
        style={{ "--toaster-height": `${height}px` } as React.CSSProperties}
        aria-live="polite"
        aria-relevant="additions text"
        data-expanded={expanded || undefined}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") setHovered(true);
        }}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setFocused(false);
        }}
      >
        {items.map((item) => (
          <ToastCard
            key={item.id}
            item={item}
            place={places[item.id]}
            paused={expanded || hidden}
            onMeasure={measure}
          />
        ))}
      </ol>
    </section>
  );
}
