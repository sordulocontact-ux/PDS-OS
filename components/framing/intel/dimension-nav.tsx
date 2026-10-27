"use client";

import { IconCheck } from "nucleo-sharp-essential";
import { useLayoutEffect, useRef, useState } from "react";

import { ViewLink } from "@/components/ui/view-link";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { factTone, type Tone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

const fr = { framingIntel };

export type NavItem = {
  key: string;
  href: string;
  title: string;
  // One line under the title (counts, written by code); none for the Brief.
  line?: string;
  status?: "known" | "to_confirm" | "missing";
};

const DOT: Record<Tone, string> = {
  neutral: "bg-[var(--tone-neutral-fg)]",
  info: "bg-[var(--tone-info-fg)]",
  warning: "bg-[var(--tone-warning-fg)]",
  success: "bg-[var(--tone-success-fg)]",
  danger: "bg-[var(--tone-danger-fg)]",
  action: "bg-[var(--tone-action-fg)]",
};
const CHECK: Record<Tone, string> = {
  neutral: "text-[color:var(--tone-neutral-fg)]",
  info: "text-[color:var(--tone-info-fg)]",
  warning: "text-[color:var(--tone-warning-fg)]",
  success: "text-[color:var(--tone-success-fg)]",
  danger: "text-[color:var(--tone-danger-fg)]",
  action: "text-[color:var(--tone-action-fg)]",
};

/**
 * The six dimensions of the Cadrage, each with its state and counts, then
 * the Brief. The white card under the open item slides to the clicked one
 * at once, before the server answers (same movement as the Master's steps).
 */
export function DimensionNav({
  items,
  current,
  label,
}: {
  items: NavItem[];
  current: string;
  label: string;
}) {
  const t = fr.framingIntel;
  const [clicked, setClicked] = useState<{ key: string; from: string } | null>(
    null,
  );
  const shown = clicked && clicked.from === current ? clicked.key : current;
  const listRef = useRef<HTMLOListElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    const card = cardRef.current;
    if (!list || !card) return;
    const place = () => {
      const item = list.querySelector<HTMLElement>(`[data-key="${shown}"]`);
      card.style.opacity = item ? "1" : "0";
      if (!item) return;
      card.style.transform = `translateY(${item.offsetTop}px)`;
      card.style.height = `${item.offsetHeight}px`;
    };
    place();
    const frame = requestAnimationFrame(() => (card.dataset.ready = "true"));
    const observer = new ResizeObserver(place);
    observer.observe(list);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [shown]);

  return (
    <nav aria-label={label} className="relative">
      <div
        ref={cardRef}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 rounded-2xl bg-background opacity-0 shadow-[var(--nav-shadow)] data-[ready=true]:transition-[transform,height] data-[ready=true]:duration-[var(--duration-slide)] data-[ready=true]:ease-[var(--ease-out)] motion-reduce:transition-none"
      />
      <ol ref={listRef} className="relative flex flex-col gap-1">
        {items.map((item) => {
          const tone = item.status ? factTone[item.status] : null;
          return (
            <li key={item.key}>
              <ViewLink
                href={item.href}
                data-key={item.key}
                aria-current={current === item.key ? "step" : undefined}
                onClick={() => setClicked({ key: item.key, from: current })}
                className={cn(
                  "relative flex flex-col gap-1 rounded-2xl px-4 py-3 transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)]",
                  shown !== item.key && "hover:bg-[var(--control-bg-hover)]",
                )}
              >
                <span className="text-body-md font-semibold text-foreground">
                  {item.title}
                </span>
                {item.line !== undefined && tone && (
                  <span className="flex min-w-0 items-center gap-2 text-caption text-muted-foreground">
                    {item.status === "known" ? (
                      <IconCheck
                        aria-hidden
                        className={cn("-mx-0.5 size-3 shrink-0", CHECK[tone])}
                      />
                    ) : (
                      <span
                        aria-hidden
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          DOT[tone],
                        )}
                      />
                    )}
                    <span className="sr-only">
                      {item.status ? t.statuses[item.status] : ""} :
                    </span>
                    <span className="truncate">{item.line}</span>
                  </span>
                )}
              </ViewLink>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
