"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

/** One proposed change, already worded by the stage. */
export type ReviewItem = {
  id: string;
  title: string;
  /** The value replaced, for an edit; null for an addition. */
  before: string | null;
  after: string;
  /** False when its quote is not in the dictation: dropped by default. */
  located: boolean;
};

/**
 * Review of a dictation: what was heard, then each proposal, kept or dropped
 * one by one. Nothing is written before "Apply".
 */
export function DictationReview({
  heard,
  items,
  pending,
  onApply,
  onDiscard,
}: {
  heard: string;
  items: ReviewItem[];
  pending: boolean;
  onApply: (ids: string[]) => void;
  onDiscard: () => void;
}) {
  const t = fr.voice;
  const [kept, setKept] = useState(
    () => new Set(items.filter((i) => i.located).map((i) => i.id)),
  );
  const toggle = (id: string) =>
    setKept((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <section
      className="grid gap-4 rounded-lg border border-border p-4"
      aria-labelledby="dictation-review-title"
    >
      <div className="grid gap-1">
        <p className="text-xs text-muted-foreground">{t.heard}</p>
        <blockquote className="text-sm whitespace-pre-wrap">
          « {heard} »
        </blockquote>
      </div>

      <div className="grid gap-1">
        <h3 id="dictation-review-title" className="text-sm font-medium">
          {t.reviewTitle}
        </h3>
        <p className="text-xs text-muted-foreground">{t.reviewHint}</p>
      </div>

      <ul className="grid divide-y divide-border">
        {items.map((item) => {
          const isKept = kept.has(item.id);
          return (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div
                className={cn(
                  "grid min-w-0 gap-1 text-sm",
                  !isKept && "text-muted-foreground",
                )}
              >
                <p className="font-medium">{item.title}</p>
                {item.before !== null && (
                  <p className="text-muted-foreground">
                    <span className="text-xs">{t.before} · </span>
                    <del>{item.before}</del>
                  </p>
                )}
                <p className="whitespace-pre-wrap">
                  {item.before !== null && (
                    <span className="text-xs text-muted-foreground">
                      {t.after} ·{" "}
                    </span>
                  )}
                  {item.after}
                </p>
                {!item.located && (
                  <StatusBadge
                    tone="danger"
                    size="sm"
                    className="h-auto justify-self-start py-0.5 whitespace-normal"
                  >
                    {t.missing}
                  </StatusBadge>
                )}
              </div>
              <Button
                size="sm"
                variant={isKept ? "ghost" : "outline"}
                disabled={pending}
                onClick={() => toggle(item.id)}
              >
                {isKept ? t.drop : t.keep}
              </Button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={pending || kept.size === 0}
          onClick={() =>
            onApply(items.filter((i) => kept.has(i.id)).map((i) => i.id))
          }
        >
          {pending ? t.applying : t.apply(kept.size)}
        </Button>
        <Button variant="ghost" disabled={pending} onClick={onDiscard}>
          {t.discard}
        </Button>
      </div>
    </section>
  );
}
