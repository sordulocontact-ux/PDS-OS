import Link from "next/link";

import {
  PlatformEditButton,
  PlatformVerifyButton,
} from "@/components/distribution/platform-forms";
import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import type { Anomaly } from "@/lib/distribution/anomalies";
import { platformLabel, type PlatformView } from "@/lib/distribution/platforms";
import { fr } from "@/lib/i18n/fr";
import { formatShortDate } from "@/lib/release/format";
import {
  anomalySeverityTone,
  platformComplianceTone,
  platformVerificationTone,
} from "@/lib/ui/state-tones";

const t = fr.distribution.platforms;

/**
 * One line per platform (§ 12, CA10): official link, declared availability,
 * verification and compliance — each with who and when —, its open
 * anomalies (handled in the Suivi) and the detection's link as a suggestion
 * only.
 */
export function PlatformsSection({
  projectId,
  platforms,
  anomalies,
  canEdit,
  canCheck,
}: {
  projectId: string;
  platforms: PlatformView[];
  // Open ones only.
  anomalies: Anomaly[];
  canEdit: boolean;
  canCheck: boolean;
}) {
  return (
    <PageSection
      id="platforms"
      title={t.title}
      description={t.description}
      card
      action={
        canEdit ? (
          <PlatformEditButton
            projectId={projectId}
            platform=""
            name={null}
            url={null}
            declared={false}
            suggestion={null}
          />
        ) : undefined
      }
    >
      <ul className="flex flex-col gap-5">
        {platforms.map((platform) => {
          const name = platformLabel(platform);
          return (
            <li
              key={platform.platform}
              className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
            >
              <div className="grid min-w-0 gap-1">
                <p className="font-medium">{name}</p>
                {platform.url ? (
                  <a
                    href={platform.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm break-all underline-offset-4 hover:underline focus-visible:underline"
                  >
                    {platform.url}
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">{t.noLink}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  {platform.declared
                    ? t.declared(
                        platform.declared.by,
                        formatShortDate(platform.declared.at),
                      )
                    : t.notDeclared}
                </p>
                <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <StatusBadge
                    tone={platformVerificationTone[platform.verification]}
                    size="sm"
                  >
                    {t.verifications[platform.verification]}
                  </StatusBadge>
                  {platform.verified &&
                    t.checkedBy(
                      platform.verified.by,
                      formatShortDate(platform.verified.at),
                    )}
                  <StatusBadge
                    tone={platformComplianceTone[platform.compliance]}
                    size="sm"
                  >
                    {t.compliances[platform.compliance]}
                  </StatusBadge>
                  {platform.complianced &&
                    t.checkedBy(
                      platform.complianced.by,
                      formatShortDate(platform.complianced.at),
                    )}
                </p>
                {[platform.verificationNote, platform.complianceNote]
                  .filter(Boolean)
                  .map((note) => (
                    <p
                      key={note}
                      className="text-sm break-words text-muted-foreground"
                    >
                      « {note} »
                    </p>
                  ))}
                {anomalies
                  .filter((a) => a.platform === platform.platform)
                  .map((anomaly) => (
                    <p
                      key={anomaly.id}
                      className="flex flex-wrap items-center gap-2 text-sm"
                    >
                      {t.openAnomaly}
                      <StatusBadge
                        tone={anomalySeverityTone[anomaly.severity]}
                        size="sm"
                      >
                        {fr.distribution.anomalies.kinds[anomaly.kind]}
                      </StatusBadge>
                      <Link
                        href={`${routes.projectReleaseTracking(projectId)}#anomalies`}
                        className="underline-offset-4 hover:underline focus-visible:underline"
                      >
                        {t.seeAnomaly}
                      </Link>
                    </p>
                  ))}
                {platform.suggestion && (
                  <p className="text-sm break-all text-muted-foreground">
                    {t.suggestion} {platform.suggestion}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {canEdit && (
                  <PlatformEditButton
                    projectId={projectId}
                    platform={platform.platform}
                    name={name}
                    url={platform.url}
                    declared={platform.declared !== null}
                    suggestion={platform.suggestion}
                  />
                )}
                {canCheck && platform.url && (
                  <PlatformVerifyButton
                    projectId={projectId}
                    platform={platform.platform}
                    name={name}
                    verification={platform.verification}
                    verificationNote={platform.verificationNote}
                    compliance={platform.compliance}
                    complianceNote={platform.complianceNote}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </PageSection>
  );
}
