import { notFound } from "next/navigation";

import { AgreementsView } from "@/components/legal/contracts/agreements-view";
import { ClearancesView } from "@/components/legal/clearance/clearances-view";
import { FormalitiesView } from "@/components/legal/formalities/formalities-view";
import { ConfirmationView } from "@/components/legal/confirmation/confirmation-view";
import { FormsView } from "@/components/legal/forms/forms-view";
import { IntakeView } from "@/components/legal/intake/intake-view";
import { PlanView } from "@/components/legal/plan/plan-view";
import { SplitsView } from "@/components/legal/splits/splits-view";
import { TrackingView } from "@/components/legal/tracking/tracking-view";
import { LegalInventory } from "@/components/legal/legal-inventory";
import { can } from "@/lib/auth/access";
import { asFactStatus } from "@/lib/facts/views";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { loadConfirmation } from "@/lib/legal/confirmation/queries";
import { loadClearances } from "@/lib/legal/clearance/queries";
import { loadAgreements } from "@/lib/legal/contracts/queries";
import { loadFormalities } from "@/lib/legal/formalities/queries";
import { loadLegalInventory } from "@/lib/legal/inventory";
import { loadForms } from "@/lib/legal/forms/queries";
import { loadIntake } from "@/lib/legal/intake/queries";
import { loadLegalPlan } from "@/lib/legal/plan/queries";
import { loadSplits } from "@/lib/legal/splits/queries";
import { loadTracking } from "@/lib/legal/tracking/queries";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { builtLegalStepOf } from "@/lib/ui/legal-steps";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.shell.project.sidebar.legal} · ${fr.app.name}`,
};

// Juridique: the État des lieux at /legal, the Cadrage juridique at
// /legal/framing, the Confirmation at /legal/confirmation, the Plan d'action
// at /legal/plan, the Suivi at /legal/tracking, the branches' pages
// (/legal/forms, /legal/contracts); a step not built yet (greyed
// in the steps) is a 404.
// Reserved to manage_legal: anyone else gets the same 404 as a missing page.
export default async function ProjectLegalPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/legal/[[...step]]">) {
  const [{ projectId, step }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const current = builtLegalStepOf(step);
  if (!current) notFound();
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  if (!can(access, "manage_legal")) notFound();

  if (current === "framing") {
    // The dossier beside the conversation is the État des lieux itself.
    const [intake, inventory] = await Promise.all([
      loadIntake(project),
      loadLegalInventory(project, access),
    ]);
    return (
      <IntakeView
        projectId={project.id}
        intake={intake}
        inventory={inventory}
        // Checked against the questions by the workspace: anything else is
        // ignored.
        initialQuestion={
          typeof query.question === "string" ? query.question : null
        }
      />
    );
  }
  if (current === "formalities") {
    const titles = await loadFormalities(project, access);
    return <FormalitiesView projectId={project.id} titles={titles} />;
  }
  if (current === "clearances") {
    const clearances = await loadClearances(project, access);
    return <ClearancesView projectId={project.id} clearances={clearances} />;
  }
  if (current === "splits") {
    const splits = await loadSplits(project, access);
    return <SplitsView projectId={project.id} splits={splits} />;
  }
  if (current === "contracts") {
    const agreements = await loadAgreements(project, access);
    return <AgreementsView projectId={project.id} agreements={agreements} />;
  }
  if (current === "forms") {
    const rows = await loadForms(project, access);
    return <FormsView projectId={project.id} rows={rows} />;
  }
  if (current === "tracking") {
    const tracking = await loadTracking(project, access);
    return <TrackingView projectId={project.id} tracking={tracking} />;
  }
  if (current === "plan") {
    const plan = await loadLegalPlan(project, access);
    return <PlanView projectId={project.id} plan={plan} />;
  }
  if (current === "confirmation") {
    const confirmation = await loadConfirmation(project, access);
    return (
      <ConfirmationView projectId={project.id} confirmation={confirmation} />
    );
  }
  const inventory = await loadLegalInventory(project, access);
  return (
    <LegalInventory inventory={inventory} state={asFactStatus(query.state)} />
  );
}
