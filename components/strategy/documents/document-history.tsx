import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";
import { formatDay } from "@/lib/assistant/facts";
import { fr } from "@/lib/i18n/fr";
import type { StrategyDocument } from "@/lib/strategy/workspace";
import { strategyDocumentTone } from "@/lib/ui/state-tones";

/**
 * Every version of a document, newest first: its state, who sent and who
 * decided, the comments. Nothing is ever overwritten.
 */
export function DocumentHistory({
  versions,
  hrefOf,
  currentId,
}: {
  versions: StrategyDocument[];
  hrefOf?: (doc: StrategyDocument) => string;
  currentId?: string;
}) {
  const t = fr.strategyDocs;
  if (versions.length === 0) return null;
  return (
    <section aria-labelledby="history-title" className="flex flex-col gap-3">
      <h3 id="history-title" className="text-body-lg font-semibold">
        {t.validation.history}
      </h3>
      <ol className="flex flex-col gap-3">
        {versions.map((v) => {
          const state =
            (t.states as Record<string, string>)[v.state] ?? v.state;
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
                <StatusBadge
                  tone={strategyDocumentTone[v.state] ?? "neutral"}
                  size="sm"
                >
                  {state}
                </StatusBadge>
              </div>
              <p className="text-caption text-muted-foreground">
                {t.brief.generatedOn(formatDay(v.createdAt))} ·{" "}
                {v.createdByName}
                {v.sentAt
                  ? ` · ${t.validation.sentBy(v.createdByName, formatDay(v.sentAt))}`
                  : ""}
              </p>
              {v.reviews
                .filter((r) => r.decidedAt)
                .map((r) => (
                  <p key={r.id} className="text-caption text-muted-foreground">
                    {t.validation.decidedBy(
                      r.name,
                      t.validation.states[r.state],
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
