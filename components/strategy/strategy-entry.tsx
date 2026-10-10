import { StartStrategyForm } from "@/components/strategy/start-strategy-form";
import { StrategyCallSheet } from "@/components/strategy/strategy-call-sheet";
import { FactList } from "@/components/ui/fact-list";
import { sectionCardClass } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";
import type { StrategyCallSheetData } from "@/lib/strategy/call-prep";
import { stageTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

/**
 * The Stratégie's first screen (ticket Stratégie § 1): the project's context
 * at a glance and the two ways in — straight with PO, or an exchange PO
 * prepares from what the strategy lacks. No dashboard yet.
 */
export function StrategyEntry({
  projectId,
  context,
  callReportCount,
  canEdit,
  callSheet,
}: {
  projectId: string;
  context: {
    title: string;
    artistName: string;
    kind: string;
    // YYYY-MM-DD: the planned release, or the project's due date.
    releaseDate: string | null;
  };
  callReportCount: number;
  canEdit: boolean;
  callSheet: StrategyCallSheetData | null;
}) {
  const t = fr.strategyEntry;
  return (
    <section
      aria-labelledby="strategy-entry-title"
      className={cn(sectionCardClass, "mt-6 flex flex-col gap-6")}
    >
      <div className="flex flex-col gap-2">
        <h2 id="strategy-entry-title" className="text-display-sm font-semibold">
          {t.title}
        </h2>
        <p className="max-w-prose text-body-md text-muted-foreground">
          {canEdit ? t.body : t.readOnly}
        </p>
      </div>

      <FactList
        facts={[
          { label: t.facts.project, value: context.title },
          // Always known for a launched project; left out rather than blank.
          ...(context.artistName
            ? [{ label: t.facts.artist, value: context.artistName }]
            : []),
          ...(context.kind
            ? [{ label: t.facts.type, value: context.kind }]
            : []),
          {
            label: t.facts.releaseDate,
            value: context.releaseDate
              ? formatBriefDate(context.releaseDate)
              : null,
          },
          {
            label: t.facts.status,
            value: (
              <StatusBadge tone={stageTone.not_started} size="sm">
                {t.notStarted}
              </StatusBadge>
            ),
          },
        ]}
        emptyLabel={t.facts.noReleaseDate}
      />

      {canEdit && callSheet && (
        <div className="flex flex-col gap-3">
          <p className="text-caption text-muted-foreground">
            {t.sources(callReportCount)}
          </p>
          <div className="flex flex-wrap gap-2">
            <StartStrategyForm projectId={projectId} />
            <StrategyCallSheet projectId={projectId} data={callSheet} />
          </div>
        </div>
      )}
    </section>
  );
}
