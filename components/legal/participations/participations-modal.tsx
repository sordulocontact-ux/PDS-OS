import { ParticipationsDialog } from "@/components/legal/participations/participations-dialog";
import { ParticipationsView } from "@/components/legal/participations/participations-view";
import { can, type Access } from "@/lib/auth/access";
import { loadParticipationTracking } from "@/lib/legal/participation-tracking";

/**
 * « Participations et contrats » (lot 11 of docs/pds-mic-plan.md) in its
 * panel over « Titres »: each artist on each title, the contract of the
 * participation and its deal, read under their rights. The page mounts it
 * only for whoever reads the Juridique (manage_legal), on a collective,
 * while the URL asks for it: nothing is loaded otherwise.
 */
export async function ParticipationsModal({
  project,
  access,
}: {
  project: { id: string; ownerPersonId: string | null };
  access: Access;
}) {
  const tracking = await loadParticipationTracking(project, access);
  return (
    <ParticipationsDialog>
      <ParticipationsView
        titles={tracking.titles}
        dealReach={tracking.dealReach}
        contracts={tracking.contracts}
        canCreate={tracking.canCreate}
        canWaive={can(access, "validate")}
        negotiators={tracking.negotiators}
        today={tracking.today}
        projectId={project.id}
      />
    </ParticipationsDialog>
  );
}
