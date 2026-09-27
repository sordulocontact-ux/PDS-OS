import { IconLink, IconPaperclip } from "nucleo-sharp-essential";

import { VersionActions } from "@/components/design/version-actions";
import { IconArrowDown, IconExternalLink } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/calls/format";
import { formatFileSize } from "@/lib/catalog/file-rules";
import type { DesignVersion } from "@/lib/design/versions";
import { fr } from "@/lib/i18n/fr";
import { designStateTone } from "@/lib/ui/state-tones";

/** One deposited version: what it is, who sent it, and its review. */
export function VersionItem({
  projectId,
  version,
  canReview,
  mePersonId,
  inProgress,
}: {
  projectId: string;
  version: DesignVersion;
  // Latest version only, owner only, Conception in progress.
  canReview: boolean;
  mePersonId: string | null;
  inProgress: boolean;
}) {
  const t = fr.design.version;
  const submitted = version.status === "submitted";
  const canWithdraw =
    inProgress && submitted && version.authorPersonId === mePersonId;
  const Icon = version.kind === "file" ? IconPaperclip : IconLink;
  const label =
    version.kind === "file"
      ? [version.fileName, version.bytes ? formatFileSize(version.bytes) : null]
          .filter(Boolean)
          .join(" · ")
      : version.href;

  return (
    <article className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-medium">{t.label(version.number)}</h4>
          <StatusBadge tone={designStateTone[version.status]} size="sm">
            {fr.design.states[version.status]}
          </StatusBadge>
        </div>
        <p className="text-xs text-muted-foreground">
          {t.by(version.authorName, formatDateTime(version.createdAt))}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--surface-soft)] px-3 py-2">
        <span className="flex min-w-0 items-center gap-2 text-sm">
          <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">{label}</span>
        </span>
        {version.href ? (
          <a
            href={version.href}
            target={version.kind === "link" ? "_blank" : undefined}
            rel={version.kind === "link" ? "noopener noreferrer" : undefined}
            aria-label={t.openLabel(version.number)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {version.kind === "file" ? (
              <IconArrowDown aria-hidden />
            ) : (
              <IconExternalLink aria-hidden />
            )}
            {version.kind === "file" ? t.download : t.open}
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">{t.unavailable}</span>
        )}
      </div>

      {version.note && (
        <p className="text-sm whitespace-pre-wrap">{version.note}</p>
      )}
      {version.reviewedAt && (
        <div className="grid gap-0.5 border-l-2 border-border pl-3">
          {version.reviewComment && (
            <p className="text-sm whitespace-pre-wrap">
              {version.reviewComment}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {t.reviewedBy(
              version.reviewerName,
              formatDateTime(version.reviewedAt),
            )}
          </p>
        </div>
      )}

      {(canReview && submitted) || canWithdraw ? (
        <VersionActions
          projectId={projectId}
          versionId={version.id}
          number={version.number}
          canReview={canReview && submitted}
          canWithdraw={canWithdraw}
        />
      ) : null}
    </article>
  );
}
