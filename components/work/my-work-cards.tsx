import { FormMessage } from "@/components/auth/form-message";
import {
  HandoverCard,
  ProposalsCard,
  TasksCard,
  ValidationsCard,
} from "@/components/home/home-cards";
import { CardGrid } from "@/components/ui/card-grid";
import {
  CreativeProjectsCard,
  DeliverablesCard,
  OwnedProjectsCard,
} from "@/components/work/work-cards";
import { can, type Access } from "@/lib/auth/access";
import { fr } from "@/lib/i18n/fr";
import { loadMyWork } from "@/lib/work/queries";

// The cards of the Travail page, each gated by a permission. Streamed
// behind a Suspense boundary: the page header shows before they load.
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

        {can(access, "validate") && (
          <ValidationsCard validations={work.validations} all />
        )}
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

        {can(access, "pilot_projects") && (
          <>
            <OwnedProjectsCard projects={work.ownedProjects} />
            <DeliverablesCard
              title={t.cards.deliverablesToStaff}
              empty={t.cards.deliverablesToStaffEmpty}
              deliverables={work.deliverablesToStaff}
            />
            <ProposalsCard proposals={work.proposals} all />
          </>
        )}

        {can(access, "creative_work") && (
          <>
            <DeliverablesCard
              title={t.cards.myDeliverables}
              empty={t.cards.myDeliverablesEmpty}
              deliverables={work.myDeliverables}
            />
            <CreativeProjectsCard projects={work.creativeProjects} />
          </>
        )}

        <TasksCard tasks={work.tasks} all />
      </CardGrid>
    </>
  );
}
