import { StatusBadge } from "@/components/ui/status-badge";
import { Timestamp } from "@/components/ui/timestamp";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import type { DesignExchange } from "@/lib/design/exchanges";
import { fr } from "@/lib/i18n/fr";

/**
 * The creative exchanges on the Conception's home (MKT-C2-05): each call to
 * come or past, its scope (the release, or deliverables), and once read
 * what it produced — decisions, open questions, actions — apart from PO's
 * ideas, to confirm or confirmed. `actions`: prepare one, attach one.
 * Without any, the reason the Conception started without one.
 */
export function ConceptionExchanges({
  projectId,
  exchanges,
  skippedReason,
  actions,
}: {
  projectId: string;
  exchanges: DesignExchange[];
  skippedReason: string | null;
  actions?: React.ReactNode;
}) {
  const t = fr.conceptionCall.exchanges;
  return (
    <section
      aria-labelledby="conception-exchanges"
      className="flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 id="conception-exchanges" className="text-body-lg font-semibold">
            {t.title}
          </h3>
          <p className="max-w-prose text-caption text-muted-foreground">
            {t.hint}
          </p>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {exchanges.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-4 text-body-md text-muted-foreground">
          {skippedReason ? t.skipped(skippedReason) : t.empty}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {exchanges.map((x) => (
            <li key={x.callId}>
              <ViewLink
                href={routes.projectCall(projectId, x.callId)}
                className="flex flex-col gap-1 rounded-xl border border-border bg-background px-4 py-3 transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--control-bg-hover)]"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-body-md font-medium break-words">
                    {x.title}
                  </span>
                  <StatusBadge tone={x.upcoming ? "info" : "neutral"} size="sm">
                    {x.upcoming ? t.upcoming : t.past}
                  </StatusBadge>
                </span>
                <span className="text-caption text-muted-foreground">
                  <Timestamp iso={x.occurredAt} /> ·{" "}
                  {x.deliverables.length
                    ? t.scopeDeliverables(x.deliverables)
                    : t.scopeRelease}
                </span>
                <span className="text-caption text-muted-foreground">
                  {x.report
                    ? t.synthesis(
                        x.report.decisions,
                        x.report.open,
                        x.report.actions,
                      )
                    : t.noReport}
                </span>
                {(x.ideas.proposed > 0 || x.ideas.confirmed > 0) && (
                  <span className="text-caption text-muted-foreground">
                    {t.ideas(x.ideas.proposed, x.ideas.confirmed)}
                  </span>
                )}
              </ViewLink>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
