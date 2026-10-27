import Link from "next/link";

import {
  AnomalyStateButton,
  ReportAnomalyButton,
} from "@/components/distribution/anomaly-forms";
import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import { moduleHref, type Anomaly } from "@/lib/distribution/anomalies";
import { distribution } from "@/lib/i18n/fr/distribution";
import { formatShortDate } from "@/lib/release/format";
import { anomalySeverityTone, anomalyStateTone } from "@/lib/ui/state-tones";

const fr = { distribution };

const t = fr.distribution.anomalies;

/**
 * The anomalies (§ 9, CA12): what is wrong, how serious, and the module
 * where it is corrected, opened from here; Distribution never corrects.
 */
export function AnomaliesSection({
  projectId,
  anomalies,
  platforms,
  firstMasterId,
  uncheckedChecks,
  canCheck,
}: {
  projectId: string;
  anomalies: Anomaly[];
  platforms: Array<{ key: string; name: string }>;
  firstMasterId: string | null;
  // Said when nothing was reported while checks remain to do (§ 13).
  uncheckedChecks: number;
  canCheck: boolean;
}) {
  const nameOf = (key: string | null) =>
    key ? (platforms.find((p) => p.key === key)?.name ?? key) : null;
  return (
    <PageSection
      id="anomalies"
      title={t.title}
      description={t.description}
      card
      action={
        canCheck ? (
          <ReportAnomalyButton projectId={projectId} platforms={platforms} />
        ) : undefined
      }
    >
      {anomalies.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {uncheckedChecks > 0 ? t.emptyChecks : t.empty}
        </p>
      ) : (
        <ul className="flex flex-col gap-5">
          {anomalies.map((anomaly) => (
            <li
              key={anomaly.id}
              className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
            >
              <div className="grid min-w-0 gap-1">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {t.kinds[anomaly.kind]}
                  <StatusBadge
                    tone={anomalySeverityTone[anomaly.severity]}
                    size="sm"
                  >
                    {t.severities[anomaly.severity]}
                  </StatusBadge>
                  <StatusBadge tone={anomalyStateTone[anomaly.state]} size="sm">
                    {t.states[anomaly.state]}
                  </StatusBadge>
                </p>
                <p className="text-sm break-words">{anomaly.description}</p>
                {anomaly.platform && (
                  <p className="text-sm text-muted-foreground">
                    {t.platform(nameOf(anomaly.platform) ?? anomaly.platform)}
                  </p>
                )}
                <p className="text-sm">
                  <span className="text-muted-foreground">
                    {t.correctIn(t.modules[anomaly.module])}
                  </span>{" "}
                  <Link
                    href={moduleHref(anomaly.module, {
                      projectId,
                      firstMasterId,
                    })}
                    className="font-medium underline-offset-4 hover:underline focus-visible:underline"
                  >
                    {t.open}
                  </Link>
                </p>
                <p className="text-sm text-muted-foreground">
                  {t.reported(
                    anomaly.reportedBy,
                    formatShortDate(anomaly.reportedAt),
                    anomaly.version,
                  )}
                </p>
                {anomaly.stateAt && (
                  <p className="text-sm break-words text-muted-foreground">
                    {t.stateLine(
                      t.states[anomaly.state],
                      anomaly.stateBy,
                      formatShortDate(anomaly.stateAt),
                    )}
                    {anomaly.stateNote && ` · « ${anomaly.stateNote} »`}
                  </p>
                )}
              </div>
              {canCheck && (
                <div className="shrink-0">
                  <AnomalyStateButton
                    projectId={projectId}
                    anomalyId={anomaly.id}
                    state={anomaly.state}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </PageSection>
  );
}
