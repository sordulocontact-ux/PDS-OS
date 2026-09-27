import { DepositVersion } from "@/components/design/deposit-version";
import { VersionItem } from "@/components/design/version-item";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDay } from "@/lib/assistant/facts";
import type { DesignTrack as Track } from "@/lib/design/queries";
import { fr } from "@/lib/i18n/fr";
import { designStateTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

/**
 * A line of work of the Dossier, version after version: the latest version
 * first (reviewed there), older ones folded underneath, and the deposit.
 * `heading` = the deliverable's title; none for the creative direction's
 * boards, whose section already carries one.
 */
export function DesignTrack({
  track,
  organizationId,
  projectId,
  canReview,
  mePersonId,
  inProgress,
  heading,
  depositTarget,
  emptyLabel,
}: {
  track: Track;
  organizationId: string;
  projectId: string;
  canReview: boolean;
  mePersonId: string | null;
  inProgress: boolean;
  heading?: React.ReactNode;
  depositTarget: string;
  emptyLabel: string;
}) {
  const t = fr.design;
  const [latest, ...older] = track.versions;

  return (
    <div
      className={cn(
        "grid gap-3",
        heading && "rounded-xl border border-border p-4",
      )}
    >
      {heading && (
        <div className="flex flex-wrap items-start justify-between gap-2">
          {heading}
          <StatusBadge tone={designStateTone[track.state]}>
            {t.states[track.state]}
          </StatusBadge>
        </div>
      )}

      {latest ? (
        <VersionItem
          projectId={projectId}
          version={latest}
          canReview={canReview}
          mePersonId={mePersonId}
          inProgress={inProgress}
        />
      ) : (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      )}

      {older.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer py-1 text-caption text-muted-foreground">
            {t.version.history(older.length)}
          </summary>
          <ul className="grid gap-4 pt-2">
            {older.map((version) => (
              <li key={version.id} className="border-t border-border pt-3">
                {/* Superseded: never reviewed again, only read. */}
                <VersionItem
                  projectId={projectId}
                  version={version}
                  canReview={false}
                  mePersonId={mePersonId}
                  inProgress={false}
                />
              </li>
            ))}
          </ul>
        </details>
      )}

      {track.canDeposit && (
        <DepositVersion
          organizationId={organizationId}
          projectId={projectId}
          deliverableId={track.deliverableId}
          target={depositTarget}
        />
      )}
    </div>
  );
}

/** Title and facts of a committed deliverable, as the track's heading. */
export function DeliverableHeading({ track }: { track: Track }) {
  const t = fr.design.deliverables;
  return (
    <div className="grid gap-0.5">
      <h4 className="text-body-md font-medium">{track.title}</h4>
      <p className="text-xs text-muted-foreground">
        {[
          track.leverLabel,
          track.assigneeName ?? t.noAssignee,
          track.dueDate ? t.due(formatDay(track.dueDate)) : t.noDueDate,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </div>
  );
}
