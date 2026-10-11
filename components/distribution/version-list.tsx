import { StatusBadge } from "@/components/ui/status-badge";
import type { DistributionVersion } from "@/lib/distribution/validation";
import { fr } from "@/lib/i18n/fr";
import { formatShortDate } from "@/lib/release/format";
import { distributionVersionTone } from "@/lib/ui/state-tones";

const t = fr.distribution.validation;

/** Every version of the dossier, newest first: never rewritten (§ 9). */
export function VersionList({ versions }: { versions: DistributionVersion[] }) {
  return (
    <div className="grid gap-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        {t.versions}
      </h3>
      {versions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.noVersion}</p>
      ) : (
        <ul className="grid gap-3">
          {versions.map((version) => {
            const state = version.supersededAt ? "superseded" : version.status;
            return (
              <li key={version.id} className="grid gap-0.5">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {t.version(version.number)}
                  <StatusBadge tone={distributionVersionTone[state]} size="sm">
                    {t.status[state]}
                  </StatusBadge>
                </p>
                <p className="text-sm text-muted-foreground">
                  {t.submittedLine(
                    version.submittedBy,
                    formatShortDate(version.submittedAt),
                    version.validatorName,
                  )}
                </p>
                {version.decidedAt && (
                  <p className="text-sm text-muted-foreground">
                    {t.decidedLine(
                      version.decidedBy,
                      formatShortDate(version.decidedAt),
                    )}
                    {version.note && (
                      <span className="break-words"> · « {version.note} »</span>
                    )}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
