import { FormMessage } from "@/components/auth/form-message";
import {
  HandoverCard,
  ProposalsCard,
  TasksCard,
  ValidationsCard,
} from "@/components/home/home-cards";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import {
  CreativeProjectsCard,
  DeliverablesCard,
  OwnedProjectsCard,
} from "@/components/work/work-cards";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { loadMyWork } from "@/lib/work/queries";

// Everyone's work, each list gated by a permission (docs/CONTEXTE-PROJET.md
// § 12): the director decides, the project manager runs, the creative
// director designs. Someone holding several permissions sees every block.
export default async function WorkPage() {
  const access = await requireApproved();
  const t = fr.work;
  const work = await loadMyWork(access);
  const transmission = fr.transmission.cards;

  return (
    <PageContainer>
      <PageHeader
        title={t.title}
        description={
          (access.role && t.descriptions[access.role]) || t.descriptionFallback
        }
      />

      {work.error && <FormMessage kind="error">{t.loadError}</FormMessage>}

      <div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
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
      </div>
    </PageContainer>
  );
}
