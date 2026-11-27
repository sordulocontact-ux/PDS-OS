"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

// Shown as soon as the pointer rests, like the tooltips (tooltip.tsx).
const DELAY = 150;
// Kept this far from the window's edges.
const EDGE = 16;

type Hint = { text: string; left: number; top: number; height: number };

/**
 * Around a table (DataTable): a text cut by « … » (`.truncate`) shows whole
 * on hover, in a bubble laid over it (Sacha 25/11/2026: « Rattaché à »,
 * a contract's parties, a long name). One listener for the whole table,
 * shown only when the text is really cut; a mouse only (a phone's hidden
 * columns read under the name). Decorative: the whole text is already in
 * the page for a screen reader.
 */
export function OverflowHintArea({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const [hint, setHint] = useState<Hint | null>(null);
  const timer = useRef<number | null>(null);
  const target = useRef<Element | null>(null);

  const cancel = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };

  const onPointerOver = (event: React.PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    const el = (event.target as Element).closest(".truncate");
    if (el === target.current) return;
    cancel();
    target.current = el;
    setHint(null);
    if (!(el instanceof HTMLElement) || el.scrollWidth <= el.clientWidth + 1)
      return;
    timer.current = window.setTimeout(() => {
      const text = el.innerText.trim();
      if (!text) return;
      const rect = el.getBoundingClientRect();
      setHint({
        text,
        left: rect.left,
        top: rect.top,
        height: rect.height,
      });
    }, DELAY);
  };

  const onPointerLeave = () => {
    cancel();
    target.current = null;
    setHint(null);
  };

  return (
    <div
      className={className}
      onPointerOver={onPointerOver}
      onPointerLeave={onPointerLeave}
      // A scroll moves the text away from its bubble.
      onWheel={onPointerLeave}
    >
      {children}
      {hint && <HintBubble hint={hint} />}
    </div>
  );
}

// Laid over the cut text, at its place, the whole text on one line or
// wrapped when longer than the window allows.
function HintBubble({ hint }: { hint: Hint }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const overflow = hint.left + el.offsetWidth - (window.innerWidth - EDGE);
    setShift(overflow > 0 ? Math.min(overflow, hint.left - EDGE) : 0);
  }, [hint]);

  return createPortal(
    <div
      ref={ref}
      aria-hidden
      style={{
        // Positioned on the text it shows: measured in the page, no token.
        left: hint.left - shift,
        top: hint.top + hint.height / 2,
      }}
      className={cn(
        "pointer-events-none fixed z-50 max-w-[min(32rem,calc(100vw-2rem))] -translate-x-2.5 -translate-y-1/2 rounded-[var(--radius-md)] border border-border bg-popover px-2.5 py-1.5 text-[length:var(--type-body-md)] font-medium break-words text-popover-foreground shadow-elevation-1",
        "transition-opacity duration-150 ease-out motion-reduce:transition-none starting:opacity-0",
      )}
    >
      {hint.text}
    </div>,
    document.body,
  );
}
