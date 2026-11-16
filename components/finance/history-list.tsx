"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Timestamp } from "@/components/ui/timestamp";
import { readHistoryPage } from "@/lib/finance/history-actions";
import type { HistoryEntry } from "@/lib/finance/history";
import { financeExports as t } from "@/lib/i18n/fr/finance-exports";

/**
 * The changes of every Finance datum, the latest first: the first page is
 * read by the server, « Voir plus » reads the next ones in place.
 */
export function HistoryList({
  first,
  total,
}: {
  first: HistoryEntry[];
  total: number;
}) {
  const [entries, setEntries] = useState(first);
  const [pending, start] = useTransition();
  const more = () =>
    start(async () => {
      const next = await readHistoryPage(entries.length);
      setEntries((current) => [...current, ...next]);
    });

  if (entries.length === 0)
    return (
      <p className="text-body-md text-[color:var(--text-secondary)]">
        {t.history.empty}
      </p>
    );
  return (
    <>
      <ul className="-my-2 divide-y divide-[var(--border-hairline)]">
        {entries.map((h) => (
          <li
            key={h.id}
            className="flex items-start justify-between gap-3 py-2"
          >
            <span className="grid min-w-0 gap-0.5">
              <span className="text-body-md font-medium">
                {t.history.line(
                  h.who ?? t.history.someone,
                  h.entity,
                  h.action,
                  h.name,
                )}
              </span>
              {h.fields.length > 0 && (
                <span className="text-caption text-[color:var(--text-secondary)]">
                  {h.fields.join(", ")}
                </span>
              )}
            </span>
            <Timestamp
              iso={h.at}
              className="shrink-0 text-caption text-[color:var(--text-secondary)]"
            />
          </li>
        ))}
      </ul>
      {entries.length < total && (
        <Button
          variant="outline"
          className="self-start"
          disabled={pending}
          aria-label={t.history.moreLabel}
          onClick={more}
        >
          {t.history.more}
        </Button>
      )}
    </>
  );
}
