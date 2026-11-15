import { notFound } from "next/navigation";

import { ParticipationsView } from "@/components/legal/participations/participations-view";
import { ProjectHeader } from "@/components/projects/project-header";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { legalParticipations } from "@/lib/i18n/fr/legal-participations";
import { shell } from "@/lib/i18n/fr/shell";
import { loadParticipationTracking } from "@/lib/legal/participation-tracking";
import { trackingCounts } from "@/lib/legal/participation-tracking-rules";
import { requireLaunchedProject } from "@/lib/projects/queries";
import type { ModuleFact } from "@/lib/ui/module-frame";
import { allInOrder } from "@/lib/utils/parallel";

const fr = { legalParticipations, shell };

/**
 * « Participations et contrats » (lot 11 of docs/pds-mic-plan.md), a page of
 * a collective's Juridique: each artist on each title, the contract of the
 * participation and its deal, read under their rights. Like every page of
 * the section, 404 without manage_legal; 404 for any project that is not a
 * collective.
 */
export async function ParticipationsPage({ projectId }: { projectId: string }) {
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  if (!can(access, "manage_legal") || !project.collective) notFound();
  const tracking = await loadParticipationTracking(project, access);
  const t = fr.legalParticipations;
  const counts = trackingCounts(
    tracking.titles,
    tracking.dealReach,
    tracking.today,
  );
  const facts: ModuleFact[] = [
    {
      key: "signed",
      label: t.facts.signed,
      value: t.facts.signedValue(counts.signed, counts.confirmed),
    },
    ...(counts.withoutDeal !== null
      ? [
          {
            key: "without-deal",
            label: t.facts.withoutDeal,
            value: String(counts.withoutDeal),
          },
        ]
      : []),
    ...(tracking.dealReach !== "none"
      ? [
          {
            key: "follow-ups",
            label: t.facts.followUps,
            value: String(counts.followUps),
          },
        ]
      : []),
  ];
  return (
    <div className="flex flex-col gap-6">
      <ProjectHeader
        projectId={projectId}
        title={t.title}
        subtitle={t.description}
        back={{
          href: routes.projectLegal(projectId),
          label: fr.shell.project.sidebar.legal,
        }}
        facts={facts}
      />
      <ParticipationsView
        projectId={projectId}
        titles={tracking.titles}
        dealReach={tracking.dealReach}
        canCreate={tracking.canCreate}
        canWaive={can(access, "validate")}
        negotiators={tracking.negotiators}
        today={tracking.today}
      />
    </div>
  );
}
