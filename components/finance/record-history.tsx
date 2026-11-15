"use client";

import { useEffect, useState } from "react";

import { Timestamp } from "@/components/ui/timestamp";
import { readRowHistory } from "@/lib/finance/history-actions";
import type { HistoryEntry } from "@/lib/finance/history";
import { financeSheet } from "@/lib/i18n/fr/finance-home";

const t = financeSheet;

/**
 * The changes of one Finance record (finance_events, by trigger), at the
 * foot of its side sheet: who, when, what, which fields. Read when the
 * sheet shows the record (Ibé's ticket, « Historique »: auteur, date,
 * ancienne et nouvelle valeur, justification).
 */
export function RecordHistory({ rowId }: { rowId: string }) {
  // Read per record: a list read for another row counts as « loading ».
  const [read, setRead] = useState<{
    rowId: string;
    entries: HistoryEntry[];
  } | null>(null);
  useEffect(() => {
    let live = true;
    readRowHistory(rowId).then((list) => {
      if (live) setRead({ rowId, entries: list });
    });
    return () => {
      live = false;
    };
  }, [rowId]);
  const entries = read?.rowId === rowId ? read.entries : null;

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-caption font-semibold text-[color:var(--text-secondary)]">
        {t.history}
      </h3>
      {entries === null ? (
        <p className="text-caption text-[color:var(--text-tertiary)]">
          {t.historyLoading}
        </p>
      ) : entries.length === 0 ? (
        <p className="text-caption text-[color:var(--text-tertiary)]">
          {t.historyEmpty}
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {entries.map((e) => (
            <li
              key={e.id}
              className="grid grid-cols-[0.5rem_1fr] gap-3 text-caption"
            >
              <span
                aria-hidden
                className="mt-1.5 size-2 rounded-full bg-[var(--text-primary)]"
              />
              <span className="flex flex-col gap-0.5">
                <span>{t.historyBy(e.who ?? t.someone, e.action)}</span>
                {e.fields.length > 0 && (
                  <span className="text-[color:var(--text-tertiary)]">
                    {t.historyFields(e.fields.join(", "))}
                  </span>
                )}
                <Timestamp
                  iso={e.at}
                  className="text-[color:var(--text-tertiary)]"
                />
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
