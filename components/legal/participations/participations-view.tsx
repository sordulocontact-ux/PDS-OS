"use client";

import { IconUserPlus } from "@/components/icons";
import { ParticipationRow } from "@/components/legal/participations/participation-row";
import { EmptyState } from "@/components/shell/empty-state";
import { FactRows } from "@/components/ui/fact-row";
import { StatusBadge } from "@/components/ui/status-badge";
import { legalParticipations } from "@/lib/i18n/fr/legal-participations";
import type { RecapContract } from "@/lib/projects/recap-rules";
import type { BoardTitle, DealReach } from "@/lib/projects/title-board-rules";
import {
  masterNameOf,
  projectTitleLabel,
  titleGuestNames,
} from "@/lib/projects/title-rules";
import { projectTitleTone } from "@/lib/ui/state-tones";

const fr = { legalParticipations };

const labelOf = (title: BoardTitle) =>
  projectTitleLabel({
    position: title.position,
    workingTitle: title.workingTitle,
    masterTitle: masterNameOf(title.master),
    artists: titleGuestNames(title.participations),
  });

/**
 * « Participations et contrats » of a collective (lot 11), in its panel
 * over « Titres » (Sacha 27/11/2026, like « Qui fait quoi »): one block per
 * title (the project's order), its name and status above, then one fact
 * row per artist (`ParticipationRow`). The same artist on two titles: two
 * rows and two deals, one contract (the person's).
 */
export function ParticipationsView({
  projectId,
  titles,
  dealReach,
  contracts,
  canCreate,
  canWaive,
  negotiators,
  today,
}: {
  projectId: string;
  titles: BoardTitle[];
  dealReach: DealReach;
  // Each participation's contract in the recap's words, by id.
  contracts: Record<string, RecapContract>;
  canCreate: boolean;
  // The direction (« validate »): grants and revokes waivers (lot 12).
  canWaive: boolean;
  negotiators: Array<{ id: string; name: string }>;
  today: string;
}) {
  const t = fr.legalParticipations;
  if (titles.every((title) => title.participations.length === 0))
    return (
      <EmptyState
        icon={IconUserPlus}
        title={t.empty.title}
        body={t.empty.body}
      />
    );
  return (
    <div className="flex flex-col gap-6">
      {titles.map((title) => {
        const label = labelOf(title);
        return (
          <section key={title.id} className="flex flex-col gap-2">
            <h3 className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
              {label}
              {title.status !== "active" && (
                <StatusBadge tone={projectTitleTone[title.status]} size="sm">
                  {t.titleStatus[title.status]}
                </StatusBadge>
              )}
            </h3>
            <FactRows>
              {title.participations.length === 0 ? (
                <p className="px-3.5 py-2.75 text-body-sm text-[color:var(--text-tertiary)]">
                  {t.noParticipation}
                </p>
              ) : (
                title.participations.map((participation) => (
                  <ParticipationRow
                    key={participation.id}
                    projectId={projectId}
                    title={title}
                    titleLabel={label}
                    participation={participation}
                    contractState={
                      contracts[participation.id] ?? { kind: "none" }
                    }
                    dealReach={dealReach}
                    canCreate={canCreate}
                    canWaive={canWaive}
                    negotiators={negotiators}
                    today={today}
                  />
                ))
              )}
            </FactRows>
          </section>
        );
      })}
    </div>
  );
}
