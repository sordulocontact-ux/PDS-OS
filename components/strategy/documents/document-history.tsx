import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";
import { formatDay } from "@/lib/assistant/facts";
import { strategyDocuments } from "@/lib/i18n/fr/strategy-documents";
import type { StrategyDocument } from "@/lib/strategy/documents/queries";
import { strategyDocumentTone } from "@/lib/ui/state-tones";

const fr = { strategyDocuments };

/**
 * Every version of a document, newest first: its state, when it was
 * established and sent, each decision with its comment. Nothing is ever
 * overwritten (ticket Stratégie § 9). Kind-agnostic.
 */
export function DocumentHistory({
  versions,
  hrefOf,
  currentId,
}: {
  versions: StrategyDocument[];
  // Where a version opens, if it can be opened.
  hrefOf?: (doc: StrategyDocument) => string;
  currentId?: string;
}) {
  const t = fr.strategyDocuments;
  if (versions.length === 0) return null;
  return (
    <section aria-labelledby="history-title" className="flex flex-col gap-3">
      <h3 id="history-title" className="text-body-md font-semibold">
        {t.history.title}
      </h3>
      <ol className="flex flex-col gap-2">
        {versions.map((v) => {
          const title = (
            <span className="font-semibold">{t.version(v.version)}</span>
          );
          return (
            <li
              key={v.id}
              aria-current={v.id === currentId ? "true" : undefined}
              className="flex flex-col gap-1 rounded-2xl border border-border px-4 py-3 aria-[current=true]:border-[var(--selection-border)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                {hrefOf ? (
                  <Link
                    href={hrefOf(v)}
                    className="underline-offset-4 hover:underline"
                  >
                    {title}
                  </Link>
                ) : (
                  title
                )}
                <StatusBadge tone={strategyDocumentTone[v.state]} size="sm">
                  {t.states[v.state]}
                </StatusBadge>
              </div>
              <p className="text-caption text-muted-foreground">
                {t.history.entry(formatDay(v.createdAt), v.createdByName)}
                {v.sentAt ? ` · ${t.history.sentOn(formatDay(v.sentAt))}` : ""}
              </p>
              {v.reviews
                .filter((r) => r.decidedAt)
                .map((r) => (
                  <p key={r.id} className="text-caption text-muted-foreground">
                    {t.history.decision(
                      r.name,
                      t.reviewStates[r.state],
                      formatDay(r.decidedAt!),
                    )}
                    {r.comment ? ` — ${r.comment}` : ""}
                  </p>
                ))}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
