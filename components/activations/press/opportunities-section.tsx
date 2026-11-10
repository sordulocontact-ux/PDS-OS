import { EmptyNote } from "@/components/shell/empty-state";
import { ActivationSection } from "@/components/activations/activation-section";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import type { OpportunityRecord } from "@/lib/activations/press/queries";
import type { Member } from "@/lib/framing/related";
import { activationPress } from "@/lib/i18n/fr/activation-press";
import { activationWork } from "@/lib/i18n/fr/activation-work";
import { formatDate, formatDateTime } from "@/lib/release/format";

import { BriefButton, OpportunityButton } from "./opportunity-buttons";

const fr = { activationWork, activationPress };

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
    <ActivationSection
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
        <FactRows>
          {opportunities.map((o) => (
            <FactRow
              key={o.id}
              value={`${t.types[o.type as keyof typeof t.types]}${o.subject ? ` · ${o.subject}` : ""}`}
              source={
                [
                  o.scheduledAt && formatDateTime(o.scheduledAt),
                  o.location,
                  o.format,
                ]
                  .filter(Boolean)
                  .join(" · ") || null
              }
              state={{
                tone: tone[o.status as keyof typeof tone],
                label: t.statuses[o.status as keyof typeof t.statuses],
              }}
              side={
                canWrite && (
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
                )
              }
              below={
                (o.confirmedByName || o.statusNote) && (
                  <span className="flex flex-col gap-1 text-body-sm">
                    {o.confirmedByName &&
                      o.confirmationChannel &&
                      o.confirmedAt && (
                        <span>
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
                        </span>
                      )}
                    {o.statusNote && (
                      <span className="text-[color:var(--text-secondary)]">
                        {o.statusNote}
                      </span>
                    )}
                  </span>
                )
              }
            />
          ))}
        </FactRows>
      )}
    </ActivationSection>
  );
}
