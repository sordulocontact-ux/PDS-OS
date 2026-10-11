import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import type { OpportunityRecord } from "@/lib/activations/press/queries";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { formatDate, formatDateTime } from "@/lib/release/format";

import { BriefButton, OpportunityButton } from "./opportunity-buttons";

const t = fr.activationPress.opportunities;
const tone = {
  proposed: "neutral",
  availability: "info",
  confirmed: "info",
  done: "warning",
  broadcast_declared: "action",
  no_broadcast: "neutral",
  cancelled: "neutral",
} as const;

/** A press target's opportunities : each step kept apart, each confirmation
 * with who, channel and date ; the interview brief prepared by code. */
export function OpportunitiesSection({
  projectId,
  activationId,
  targetId,
  opportunities,
  briefOf,
  members,
  canWrite,
}: {
  projectId: string;
  activationId: string;
  targetId: string;
  opportunities: OpportunityRecord[];
  briefOf: (o: OpportunityRecord) => string;
  members: Member[];
  canWrite: boolean;
}) {
  return (
    <PageSection
      id="opportunities"
      title={t.title}
      description={t.description}
      action={
        canWrite && (
          <OpportunityButton
            projectId={projectId}
            activationId={activationId}
            targetId={targetId}
            opportunity={null}
            members={members}
          />
        )
      }
    >
      {opportunities.length === 0 ? (
        <EmptyNote>{t.none}</EmptyNote>
      ) : (
        <ul className="flex flex-col gap-3">
          {opportunities.map((o) => (
            <li
              key={o.id}
              className="flex flex-col gap-2 rounded-xl border bg-card p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  {t.types[o.type as keyof typeof t.types]}
                  {o.subject && ` · ${o.subject}`}
                </span>
                <StatusBadge
                  size="sm"
                  tone={tone[o.status as keyof typeof tone]}
                >
                  {t.statuses[o.status as keyof typeof t.statuses]}
                </StatusBadge>
              </div>
              <p className="text-sm text-muted-foreground">
                {[
                  o.scheduledAt && formatDateTime(o.scheduledAt),
                  o.location,
                  o.format,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {o.confirmedByName && o.confirmationChannel && o.confirmedAt && (
                <p className="text-sm">
                  {t.confirmedOn(
                    o.confirmedByName,
                    fr.activationWork.messages.channels[
                      o.confirmationChannel as "email"
                    ],
                    formatDate(o.confirmedAt),
                  )}
                  {o.confirmationProofUrl && (
                    <>
                      {" · "}
                      <a
                        href={o.confirmationProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-4"
                      >
                        {t.confirmationProof}
                      </a>
                    </>
                  )}
                </p>
              )}
              {o.statusNote && (
                <p className="text-sm text-muted-foreground">{o.statusNote}</p>
              )}
              {canWrite && (
                <div className="flex flex-wrap gap-2">
                  <OpportunityButton
                    projectId={projectId}
                    activationId={activationId}
                    targetId={targetId}
                    opportunity={o}
                    members={members}
                  />
                  {o.type === "interview" && (
                    <BriefButton
                      projectId={projectId}
                      opportunityId={o.id}
                      defaultBrief={o.brief ?? briefOf(o)}
                      saved={Boolean(o.brief)}
                    />
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </PageSection>
  );
}
