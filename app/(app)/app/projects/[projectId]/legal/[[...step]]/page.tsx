import { notFound, redirect } from "next/navigation";

import { AgreementsView } from "@/components/legal/contracts/agreements-view";
import { ClearancesView } from "@/components/legal/clearance/clearances-view";
import { FormalitiesView } from "@/components/legal/formalities/formalities-view";
import { FormsView } from "@/components/legal/forms/forms-view";
import { HistoryView } from "@/components/legal/history/history-view";
import { SplitsView } from "@/components/legal/splits/splits-view";
import { ConfirmationStep } from "@/components/legal/steps/confirmation-step";
import { FramingStep } from "@/components/legal/steps/framing-step";
import { InventoryStep } from "@/components/legal/steps/inventory-step";
import { PlanStep } from "@/components/legal/steps/plan-step";
import { TrackingStep } from "@/components/legal/steps/tracking-step";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { loadClearances } from "@/lib/legal/clearance/queries";
import { loadAgreementsGenerated } from "@/lib/legal/contracts/auto-generate";
import { loadFormalities } from "@/lib/legal/formalities/queries";
import { loadForms } from "@/lib/legal/forms/queries";
import { isMonth } from "@/lib/legal/history/filter";
import { loadLegalHistory } from "@/lib/legal/history/queries";
import { isHistoryBranch } from "@/lib/legal/history/types";
import { legalJourneyContext } from "@/lib/legal/journey-context";
import type { LegalJourneyStep } from "@/lib/legal/journey";
import { loadSplits } from "@/lib/legal/splits/queries";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { builtLegalStepOf, legalStepHref } from "@/lib/ui/legal-steps";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.shell.project.sidebar.legal} · ${fr.app.name}`,
};

// Juridique as a journey of five steps (docs/VISION-UX.md § 4, 16/10/2026):
// /legal redirects to the step that awaits the viewer; each step has its own
// page (/legal/inventory, /framing, /confirmation, /plan, /tracking) in the
// guided frame; the branches' pages (/legal/forms, /contracts…) keep their
// full-width look and open from the Suivi's lines.
// Reserved to manage_legal: anyone else gets the same 404 as a missing page.
export default async function ProjectLegalPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/legal/[[...step]]">) {
  const [{ projectId, step }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  // The section's entry opens the step that awaits the viewer.
  if (!step || step.length === 0) {
    const { steps } = await legalJourneyContext(projectId);
    redirect(entryHref(projectId, steps, query));
  }
  const current = builtLegalStepOf(step);
  if (!current) notFound();

  const question = typeof query.question === "string" ? query.question : null;
  if (current === "inventory")
    return <InventoryStep projectId={projectId} state={query.state} />;
  if (current === "framing")
    return <FramingStep projectId={projectId} question={question} />;
  if (current === "confirmation")
    return <ConfirmationStep projectId={projectId} />;
  if (current === "plan") return <PlanStep projectId={projectId} />;
  if (current === "tracking")
    return (
      <TrackingStep
        projectId={projectId}
        view={query.view}
        selected={typeof query.ligne === "string" ? query.ligne : null}
      />
    );

  // The branches' pages, full width, opened from the Suivi's lines.
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  if (!can(access, "manage_legal")) notFound();

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
  // history, the last branch page.
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

/** Where /legal lands: the step that awaits the viewer, else the current
 * one, else the État des lieux; `?question=` and `?state=` keep their step. */
function entryHref(
  projectId: string,
  steps: LegalJourneyStep[],
  query: Record<string, string | string[] | undefined>,
): string {
  if (typeof query.question === "string")
    return `${legalStepHref(projectId, "framing")}?question=${encodeURIComponent(query.question)}`;
  if (typeof query.state === "string")
    return `${legalStepHref(projectId, "inventory")}?state=${encodeURIComponent(query.state)}`;
  const target =
    steps.find((s) => s.actor?.viewer) ??
    steps.find((s) => s.status === "current");
  return legalStepHref(projectId, target?.key ?? "inventory");
}
