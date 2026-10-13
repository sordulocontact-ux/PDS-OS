import { notFound, redirect } from "next/navigation";

import { AgreementsView } from "@/components/legal/contracts/agreements-view";
import { ClearancesView } from "@/components/legal/clearance/clearances-view";
import { FormalitiesView } from "@/components/legal/formalities/formalities-view";
import {
  ConfirmationPanel,
  ConfirmationStatus,
} from "@/components/legal/confirmation/confirmation-view";
import { FormsView } from "@/components/legal/forms/forms-view";
import { HistoryView } from "@/components/legal/history/history-view";
import { IntakeWorkspace } from "@/components/legal/intake/intake-workspace";
import { PlanView } from "@/components/legal/plan/plan-view";
import { SplitsView } from "@/components/legal/splits/splits-view";
import {
  TrackingView,
  asTrackingView,
} from "@/components/legal/tracking/tracking-view";
import { LegalInventory } from "@/components/legal/legal-inventory";
import { routes } from "@/lib/auth/redirects";
import { contractProofOf } from "@/lib/contracts/proof";
import { can } from "@/lib/auth/access";
import { asFactStatus } from "@/lib/facts/views";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { loadConfirmation } from "@/lib/legal/confirmation/queries";
import { loadClearances } from "@/lib/legal/clearance/queries";
import { loadAgreementsGenerated } from "@/lib/legal/contracts/auto-generate";
import { loadFormalities } from "@/lib/legal/formalities/queries";
import { loadLegalInventory } from "@/lib/legal/inventory";
import { loadForms } from "@/lib/legal/forms/queries";
import { loadLegalHistory } from "@/lib/legal/history/queries";
import { isMonth } from "@/lib/legal/history/filter";
import { isHistoryBranch } from "@/lib/legal/history/types";
import { loadIntake } from "@/lib/legal/intake/queries";
import { loadLegalPlan, proposeLegalPlan } from "@/lib/legal/plan/queries";
import { loadSplits } from "@/lib/legal/splits/queries";
import { loadTracking } from "@/lib/legal/tracking/queries";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { builtLegalStepOf } from "@/lib/ui/legal-steps";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.shell.project.sidebar.legal} · ${fr.app.name}`,
};

// Juridique in two steps (Sacha, 07/10/2026: « très compliqué »): the État
// des lieux at /legal holds the Cadrage's questions and the Confirmation;
// the Plan d'action at /legal/plan becomes the Suivi once launched. The
// branches' pages (/legal/forms, /legal/contracts…) open from its actions.
// The old /framing, /confirmation and /tracking redirect.
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

  // The questions and the confirmation live on the État des lieux.
  if (current === "framing" || current === "confirmation") {
    const question =
      typeof query.question === "string"
        ? `?question=${encodeURIComponent(query.question)}`
        : "";
    redirect(`${routes.projectLegal(projectId)}${question}`);
  }
  if (current === "tracking")
    redirect(routes.projectLegalStep(projectId, "plan"));

  if (current === "history") {
    const history = await loadLegalHistory(project, access);
    return (
      <HistoryView
        projectId={project.id}
        history={history}
        filter={{
          branch: isHistoryBranch(query.branche) ? query.branche : null,
          person: typeof query.par === "string" ? query.par : null,
          month: isMonth(query.mois) ? query.mois : null,
        }}
      />
    );
  }
  if (current === "formalities") {
    const titles = await loadFormalities(project, access);
    return <FormalitiesView projectId={project.id} titles={titles} />;
  }
  if (current === "clearances") {
    const clearances = await loadClearances(project, access);
    return (
      <ClearancesView
        projectId={project.id}
        clearances={clearances}
        openId={typeof query.emprunt === "string" ? query.emprunt : null}
      />
    );
  }
  if (current === "splits") {
    const splits = await loadSplits(project, access);
    return <SplitsView projectId={project.id} splits={splits} />;
  }
  if (current === "contracts") {
    // The agreements that became ready are generated on the way.
    const agreements = await loadAgreementsGenerated(project, access);
    return <AgreementsView projectId={project.id} agreements={agreements} />;
  }
  if (current === "forms") {
    const rows = await loadForms(project, access);
    return <FormsView projectId={project.id} rows={rows} />;
  }
  if (current === "plan") {
    const plan = await loadLegalPlan(project, access);
    if (plan.state !== "launched")
      return <PlanView projectId={project.id} plan={plan} />;
    // Launched, the plan is followed: each line opens the panel where it
    // is done, so every branch's data is read here (the ready agreements
    // are generated on the way).
    const agreements = await loadAgreementsGenerated(project, access);
    const [tracking, clearances, forms, splits, formalities] =
      await Promise.all([
        loadTracking(project, access),
        loadClearances(project, access),
        loadForms(project, access),
        loadSplits(project, access),
        loadFormalities(project, access),
      ]);
    const proof = await contractProofOf(
      agreements.rows.flatMap((row) => (row.contract ? [row.contract.id] : [])),
    );
    return (
      <TrackingView
        projectId={project.id}
        tracking={tracking}
        view={asTrackingView(query.view)}
        selected={typeof query.ligne === "string" ? query.ligne : null}
        titles={project.masters.map((m) => ({ id: m.id, title: m.title }))}
        data={{
          forms,
          agreements,
          splits,
          clearances,
          formalities,
          proof: Object.fromEntries(proof),
        }}
      />
    );
  }

  // The État des lieux: the question of the moment, the dossier to confirm
  // once every question has an answer, then what the project knows.
  const [intake, inventory, confirmation] = await Promise.all([
    loadIntake(project),
    loadLegalInventory(project, access),
    loadConfirmation(project, access),
  ]);
  // JUR-06: before confirming, the démarches the plan will hold.
  const preview =
    confirmation.status !== "confirmed" && confirmation.openQuestions === 0
      ? await proposeLegalPlan(project, access)
      : [];
  const initialQuestion =
    typeof query.question === "string" ? query.question : null;
  return (
    <LegalInventory
      inventory={inventory}
      state={asFactStatus(query.state)}
      lead={
        <>
          <ConfirmationStatus
            projectId={project.id}
            confirmation={confirmation}
          />
          <IntakeWorkspace
            // « Corriger » from the dossier reopens its question: a new
            // workspace for it.
            key={initialQuestion ?? "intake"}
            projectId={project.id}
            questions={intake.questions}
            initialQuestion={initialQuestion}
            embedded
          />
          <ConfirmationPanel
            projectId={project.id}
            confirmation={confirmation}
            planPreview={preview.map((item) => item.kind)}
          />
        </>
      }
    />
  );
}
