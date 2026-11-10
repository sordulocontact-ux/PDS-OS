import { EmptyNote } from "@/components/shell/empty-state";
import { ActivationSection } from "@/components/activations/activation-section";
import { InfoRow, Rows } from "@/components/ui/rows";
import { StatusBadge } from "@/components/ui/status-badge";
import { alertText } from "@/lib/activations/describe";
import type { Alert } from "@/lib/activations/states";
import type { BlockerRecord } from "@/lib/activations/types";
import type { Member } from "@/lib/framing/related";
import { activations } from "@/lib/i18n/fr/activations";
import { formatDate } from "@/lib/release/format";
import { severityTone } from "@/lib/ui/state-tones";

import { AddBlockerButton, ResolveBlockerButton } from "./blocker-buttons";

const fr = { activations };

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
    <ActivationSection
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
        <Rows>
          {alerts.map((a, i) => (
            <InfoRow
              key={`${a.key}-${i}`}
              title={alertText(a)}
              badge={
                <span className="flex gap-2">
                  <StatusBadge size="sm" tone="neutral">
                    {t.categories[a.category]}
                  </StatusBadge>
                  <StatusBadge size="sm" tone={severityTone[a.severity]}>
                    {t.computed}
                  </StatusBadge>
                </span>
              }
            />
          ))}
          {ordered.map((b) => (
            <InfoRow
              key={b.id}
              title={b.description}
              detail={[
                [
                  b.blockingObject,
                  nameOf(b.ownerPersonId),
                  t.since(formatDate(b.createdAt)),
                  b.expectedResolution
                    ? `${t.expected} ${formatDate(b.expectedResolution)}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · "),
                b.impact ? `${t.impact} : ${b.impact}` : null,
                b.resolutionNote
                  ? `${t.resolution} : ${b.resolutionNote}${
                      b.resolvedAt
                        ? ` (${formatDate(b.resolvedAt)}, ${nameOf(b.resolvedBy) ?? "—"})`
                        : ""
                    }`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              badge={
                <span className="flex flex-wrap items-center gap-2">
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
                  {canWrite && b.status === "open" && (
                    <ResolveBlockerButton
                      projectId={projectId}
                      blockerId={b.id}
                    />
                  )}
                </span>
              }
            />
          ))}
        </Rows>
      )}
    </ActivationSection>
  );
}
