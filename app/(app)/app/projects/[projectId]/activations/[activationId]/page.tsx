import { EvidenceSection } from "@/components/activations/evidence/evidence-section";
import { JournalSection } from "@/components/activations/journal-section";
import { MetricsSection } from "@/components/activations/metrics/metrics-section";
import { BlockersSection } from "@/components/activations/pilot/blockers-section";
import { ClosureSection } from "@/components/activations/pilot/closure-section";
import { DependenciesSection } from "@/components/activations/pilot/dependencies-section";
import { IdentitySection } from "@/components/activations/pilot/identity-section";
import { NextActionPanel } from "@/components/activations/pilot/next-action-panel";
import { canWriteActivation } from "@/lib/activations/access";
import { loadDependencyOptions } from "@/lib/activations/dependency-options";
import { loadActivationFiche } from "@/lib/activations/fiche";
import { loadActivationFiles } from "@/lib/activations/files/queries";
import { loadActivationJournal } from "@/lib/activations/journal";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";

export const metadata = {
  title: `${fr.activations.tabs.pilotage} · ${fr.app.name}`,
};

/**
 * An activation's Pilotage (ticket « Vue d'ensemble et pilotage », § 3 to 5) :
 * identity and status, the next action, what blocks and what it depends on,
 * the proofs and statistics — declared and verified kept apart — the closure
 * and the journal.
 */
export default async function ActivationPilotPage({
  params,
}: PageProps<"/app/projects/[projectId]/activations/[activationId]">) {
  const { projectId, activationId } = await params;
  const access = await requireApproved();
  const fiche = await loadActivationFiche(projectId, activationId, access);
  const {
    activation: a,
    board,
    members,
    canWrite,
    canValidate,
    project,
  } = fiche;
  const [options, files, journal] = await Promise.all([
    canWrite ? loadDependencyOptions(projectId) : null,
    loadActivationFiles(a.id),
    loadActivationJournal(a.id, members),
  ]);
  const scope = {
    organizationId: access.organizationId ?? "",
    projectId,
    activationId: a.id,
  };
  const mine = <T extends { activationId: string }>(list: T[]) =>
    list.filter((x) => x.activationId === a.id);
  const canReopen = canWriteActivation(access, project, {
    ...a,
    status: "in_progress",
  });
  const defaultKind =
    a.kind === "press"
      ? "coverage"
      : a.kind === "event"
        ? "broadcast"
        : "publication";

  return (
    <div className="grid gap-8">
      <IdentitySection activation={a} members={members} canWrite={canWrite} />
      <NextActionPanel
        projectId={projectId}
        activationId={a.id}
        next={a.next}
        members={members}
        canWrite={canWrite}
      />
      <BlockersSection
        projectId={projectId}
        activationId={a.id}
        alerts={a.alerts}
        blockers={mine(board.data.blockers)}
        members={members}
        canWrite={canWrite}
      />
      <DependenciesSection
        projectId={projectId}
        activationId={a.id}
        dependencies={mine(board.dependencies)}
        options={
          options ?? { deliverable: [], contract: [], clearance: [], task: [] }
        }
        canWrite={canWrite}
      />
      <EvidenceSection
        scope={scope}
        evidences={mine(board.data.evidences)}
        files={files}
        members={members}
        canWrite={canWrite}
        canVerify={canValidate}
        defaultKind={defaultKind}
      />
      <MetricsSection
        scope={scope}
        metrics={mine(board.data.metrics)}
        canWrite={canWrite}
        canVerify={canValidate}
        today={todayInParis()}
      />
      <ClosureSection
        activation={a}
        members={members}
        canWrite={canWrite}
        canReopen={canReopen && a.status === "closed"}
      />
      <JournalSection entries={journal} />
    </div>
  );
}
