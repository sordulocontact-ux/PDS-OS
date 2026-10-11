import { CheckButton } from "@/components/distribution/check-form";
import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import type { CheckView } from "@/lib/distribution/view";
import { fr } from "@/lib/i18n/fr";
import { formatShortDate } from "@/lib/release/format";
import {
  distributionCheckTone,
  distributionComputedTone,
} from "@/lib/ui/state-tones";

const t = fr.distribution.checks;

/**
 * The six checks (ticket § 8, CA11): for each, what is checked, the code's
 * reading of the sources (« calculé ») and the person's result (« contrôlé
 * par … le … »), never one for the other.
 */
export function ChecksSection({
  projectId,
  checks,
  canCheck,
}: {
  projectId: string;
  checks: CheckView[];
  canCheck: boolean;
}) {
  const recorded = checks.filter((check) => check.result !== "unchecked");
  return (
    <PageSection
      id="dossier-checks"
      title={t.title}
      description={`${t.description} ${t.summary(recorded.length)}.`}
      card
    >
      <ul className="flex flex-col gap-5">
        {checks.map((check) => (
          <li
            key={check.key}
            className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
          >
            <div className="grid min-w-0 gap-1">
              <p className="font-medium">{t.items[check.key].label}</p>
              <p className="text-sm text-muted-foreground">
                {t.items[check.key].what}
              </p>
              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                <span className="text-muted-foreground">{t.computedLabel}</span>
                <StatusBadge
                  tone={distributionComputedTone[check.computed.status]}
                  size="sm"
                >
                  {t.computedStatus[check.computed.status]}
                </StatusBadge>
                <span className="break-words text-muted-foreground">
                  {check.computed.text}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                {check.checkedAt
                  ? t.checkedBy(
                      check.checkedByName ?? "—",
                      formatShortDate(check.checkedAt),
                    )
                  : t.notChecked}
                {check.note && (
                  <span className="break-words"> · « {check.note} »</span>
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge tone={distributionCheckTone[check.result]} size="sm">
                {t.results[check.result]}
              </StatusBadge>
              {canCheck && (
                <CheckButton
                  projectId={projectId}
                  checkKey={check.key}
                  result={check.result}
                  note={check.note}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
    </PageSection>
  );
}
