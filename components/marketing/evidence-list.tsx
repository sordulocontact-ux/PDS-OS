import { AddEvidenceButton } from "@/components/marketing/add-evidence-button";
import { EvidenceMenu } from "@/components/marketing/evidence-menu";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";
import type { Evidence, EvidenceKind } from "@/lib/marketing/model";
import { formatLongDay } from "@/lib/project-history/format";
import {
  evidenceAvailabilityTone,
  evidenceVerificationTone,
} from "@/lib/ui/state-tones";

const t = fr.marketing.evidence;
const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

/**
 * One kind of evidence of an activation (publications, coverage or
 * statistics): each with its level, its link state and where it comes from.
 * Declared, to verify and verified stay apart; an unavailable figure reads
 * « Indisponible », never 0.
 */
export function EvidenceList({
  projectId,
  activationId,
  kind,
  evidence,
  canContribute,
}: {
  projectId: string;
  activationId: string;
  kind: EvidenceKind;
  evidence: Evidence[];
  canContribute: boolean;
}) {
  return (
    <PageSection
      id={`evidence-${kind}`}
      title={t.sections[kind]}
      description={t.sectionHints[kind]}
      action={
        canContribute ? (
          <AddEvidenceButton
            projectId={projectId}
            activationId={activationId}
            kind={kind}
          />
        ) : undefined
      }
    >
      {evidence.length === 0 ? (
        <EmptyNote>{t.empty[kind]}</EmptyNote>
      ) : (
        <ul className="grid gap-3">
          {evidence.map((e) => (
            <EvidenceItem
              key={e.id}
              projectId={projectId}
              evidence={e}
              canContribute={canContribute}
            />
          ))}
        </ul>
      )}
    </PageSection>
  );
}

function EvidenceItem({
  projectId,
  evidence: e,
  canContribute,
}: {
  projectId: string;
  evidence: Evidence;
  canContribute: boolean;
}) {
  const provenance = [
    e.reportedBy && t.provenance.reportedBy(e.reportedBy),
    e.observedOn && t.provenance.observedOn(formatBriefDate(e.observedOn)),
    t.provenance.importedOn(formatLongDay(e.createdAt)),
  ].filter(Boolean);
  const period = t.period(
    e.periodStart && formatBriefDate(e.periodStart),
    e.periodEnd && formatBriefDate(e.periodEnd),
  );
  return (
    <li className="flex items-start gap-3 rounded-lg border border-border p-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          {e.url ? (
            <a
              href={e.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium break-words hover:underline"
            >
              {e.label}
            </a>
          ) : (
            <span className="font-medium break-words">{e.label}</span>
          )}
          <StatusBadge
            tone={evidenceVerificationTone[e.verification]}
            size="sm"
          >
            {t.verifications[e.verification]}
          </StatusBadge>
          {e.availability === "partial" && (
            <StatusBadge
              tone={evidenceAvailabilityTone[e.availability]}
              size="sm"
            >
              {t.availabilities[e.availability]}
            </StatusBadge>
          )}
          {e.kind === "publication" && !e.url && (
            <StatusBadge tone="warning" size="sm">
              {t.noLink}
            </StatusBadge>
          )}
          {e.linkUnreachableAt && (
            <StatusBadge tone="danger" size="sm">
              {t.linkUnreachable}
            </StatusBadge>
          )}
        </div>
        {e.kind === "statistic" && (
          <p className="text-sm">
            <span className="tabular-nums">
              {e.value === null ? t.unavailableValue : number.format(e.value)}
            </span>
            {" · "}
            {[e.metric, e.platform, period].filter(Boolean).join(" · ")}
          </p>
        )}
        {e.kind !== "statistic" && e.platform && (
          <p className="text-sm">{e.platform}</p>
        )}
        <p className="text-caption text-muted-foreground">
          {provenance.join(" · ")}
        </p>
        {e.verifiedAt && (
          <p className="text-caption text-muted-foreground">
            {t.provenance.verified(
              e.verifiedByName,
              formatLongDay(e.verifiedAt),
            )}
          </p>
        )}
        {e.linkUnreachableAt && (
          <p className="text-caption text-muted-foreground">
            {t.linkUnreachableSince(formatLongDay(e.linkUnreachableAt))}
          </p>
        )}
      </div>
      {canContribute && <EvidenceMenu projectId={projectId} evidence={e} />}
    </li>
  );
}
