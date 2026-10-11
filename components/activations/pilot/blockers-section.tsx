import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import { alertText } from "@/lib/activations/describe";
import type { Alert } from "@/lib/activations/states";
import type { BlockerRecord } from "@/lib/activations/types";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { formatDate } from "@/lib/release/format";
import { severityTone } from "@/lib/ui/state-tones";

import { AddBlockerButton, ResolveBlockerButton } from "./blocker-buttons";

const t = fr.activations.blockers;

/**
 * What blocks : the alerts computed by code (an owner missing, a proof to
 * provide, a dependency waiting…) and the blockers a person signalled, each
 * with its category, object, owner, impact and date. Resolved ones stay
 * listed with their resolution.
 */
export function BlockersSection({
  projectId,
  activationId,
  alerts,
  blockers,
  members,
  canWrite,
}: {
  projectId: string;
  activationId: string;
  alerts: Alert[];
  blockers: BlockerRecord[];
  members: Member[];
  canWrite: boolean;
}) {
  const nameOf = (id: string | null) =>
    members.find((m) => m.personId === id)?.name ?? null;
  const ordered = [...blockers].sort((a, b) =>
    a.status === b.status
      ? a.createdAt.localeCompare(b.createdAt)
      : a.status === "open"
        ? -1
        : 1,
  );
  return (
    <PageSection
      id="blockers"
      title={t.title}
      description={t.description}
      action={
        canWrite && (
          <AddBlockerButton
            projectId={projectId}
            activationId={activationId}
            members={members}
          />
        )
      }
    >
      {alerts.length === 0 && blockers.length === 0 ? (
        <EmptyNote>{t.none}</EmptyNote>
      ) : (
        <ul className="flex flex-col gap-2">
          {alerts.map((a, i) => (
            <li
              key={`${a.key}-${i}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed p-3"
            >
              <span className="text-sm">{alertText(a)}</span>
              <span className="flex gap-2">
                <StatusBadge size="sm" tone="neutral">
                  {t.categories[a.category]}
                </StatusBadge>
                <StatusBadge size="sm" tone={severityTone[a.severity]}>
                  {t.computed}
                </StatusBadge>
              </span>
            </li>
          ))}
          {ordered.map((b) => (
            <li
              key={b.id}
              className="flex flex-col gap-1 rounded-xl border bg-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="font-medium break-words">{b.description}</span>
                <span className="flex gap-2">
                  <StatusBadge size="sm" tone="neutral">
                    {t.categories[b.category]}
                  </StatusBadge>
                  <StatusBadge
                    size="sm"
                    tone={
                      b.status === "resolved"
                        ? "success"
                        : severityTone[b.severity]
                    }
                  >
                    {b.status === "resolved"
                      ? t.resolvedLabel
                      : t.severities[b.severity]}
                  </StatusBadge>
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {[
                  b.blockingObject,
                  nameOf(b.ownerPersonId),
                  t.since(formatDate(b.createdAt)),
                  b.expectedResolution
                    ? `${t.expected} ${formatDate(b.expectedResolution)}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {b.impact && (
                <p className="text-sm">
                  {t.impact} : {b.impact}
                </p>
              )}
              {b.resolutionNote && (
                <p className="text-sm text-muted-foreground">
                  {t.resolution} : {b.resolutionNote}
                  {b.resolvedAt &&
                    ` (${formatDate(b.resolvedAt)}, ${nameOf(b.resolvedBy) ?? "—"})`}
                </p>
              )}
              {canWrite && b.status === "open" && (
                <div>
                  <ResolveBlockerButton
                    projectId={projectId}
                    blockerId={b.id}
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
