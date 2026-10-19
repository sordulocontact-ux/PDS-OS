import { Suspense } from "react";

import { FormMessage } from "@/components/auth/form-message";
import {
  HandoverCard,
  ProposalsCard,
  TasksCard,
} from "@/components/home/home-cards";
import { CardGrid } from "@/components/ui/card-grid";
import { JourneyCardsSkeleton } from "@/components/work/journey-actions-card";
import { WorkJourneyCards } from "@/components/work/work-journey-cards";
import { can, type Access } from "@/lib/auth/access";
import { fr } from "@/lib/i18n/fr";
import { loadMyWork } from "@/lib/work/queries";

// The cards of the global Travail: a project to accept first, then one « À
// vous » card per project read from its journeys (WorkJourneyCards, streamed
// on its own), then what comes before a project's journeys, PO's proposals
// and the tasks tied to no workflow. Streamed behind a Suspense boundary:
// the header shows first.
export async function MyWorkCards({ access }: { access: Access }) {
  const t = fr.work;
  const transmission = fr.transmission.cards;
  const work = await loadMyWork(access);

  return (
    <>
      {work.error && <FormMessage kind="error">{t.loadError}</FormMessage>}

      <CardGrid className="items-start">
        {work.toAccept.length > 0 && (
          <HandoverCard
            title={transmission.toAccept}
            projects={work.toAccept}
            all
          />
        )}

        <Suspense fallback={<JourneyCardsSkeleton />}>
          <WorkJourneyCards />
        </Suspense>

        {can(access, "assign_projects") && (
          <>
            <HandoverCard
              title={transmission.toRetransmit}
              projects={work.toRetransmit}
              empty={t.cards.toRetransmitEmpty}
              all
            />
            <HandoverCard
              title={t.cards.awaitingAcceptance}
              projects={work.awaitingAcceptance}
              empty={t.cards.awaitingAcceptanceEmpty}
              all
            />
          </>
        )}

        {work.proposals.length > 0 && (
          <ProposalsCard proposals={work.proposals} all />
        )}
        {work.tasks.length > 0 && <TasksCard tasks={work.tasks} all />}
      </CardGrid>
    </>
  );
}
