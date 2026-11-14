import { notFound, redirect } from "next/navigation";

import { HistoryView } from "@/components/legal/history/history-view";
import { ParticipationsPage } from "@/components/legal/participations/participations-page";
import { ConfirmationStep } from "@/components/legal/steps/confirmation-step";
import { DemarcheStep } from "@/components/legal/steps/demarche-step";
import { FramingStep } from "@/components/legal/steps/framing-step";
import { InventoryStep } from "@/components/legal/steps/inventory-step";
import { PlanStep } from "@/components/legal/steps/plan-step";
import { ReadyStep } from "@/components/legal/steps/ready-step";
import { demarcheTarget, entryHref } from "@/lib/legal/demarches/where";
import { isMonth } from "@/lib/legal/history/filter";
import { loadLegalHistory } from "@/lib/legal/history/queries";
import { isHistoryBranch } from "@/lib/legal/history/types";
import { legalJourneyContext } from "@/lib/legal/journey-context";
import { legalRouteOf } from "@/lib/ui/legal-steps";

// The Juridique as a journey (docs/VISION-UX.md § 4, proto « Projet
// complet »): /legal redirects to the step that awaits the viewer; the
// Dossier's steps (/legal/inventory, /framing, /confirmation, /plan), one
// step per démarche (/legal/person/<ref>, /clearance/<id>, /split/<title>,
// /sacem/<title>) and « Prêt pour la sortie » (/legal/ready) share the
// guided frame. The former Suivi and branch pages (/legal/tracking, /forms,
// /contracts, /splits, /clearances, /formalities) redirect to the démarche
// they were about: notifications and tasks keep working. Reserved to
// manage_legal: anyone else gets the same 404 as a missing page.
export default async function ProjectLegalPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/legal/[[...step]]">) {
  const [{ projectId, step }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const one = (key: string) =>
    typeof query[key] === "string" ? (query[key] as string) : null;
  if (!step || step.length === 0) {
    const { steps } = await legalJourneyContext(projectId);
    redirect(entryHref(projectId, steps, query));
  }
  const route = legalRouteOf(step);
  if (!route) notFound();

  if (route.type === "demarche")
    return (
      <DemarcheStep
        projectId={projectId}
        kind={route.kind}
        slug={route.slug}
        // « Voir sa fiche » from a contract's value (JUR-10).
        part={one("partie")}
      />
    );
  if (route.type === "ready") return <ReadyStep projectId={projectId} />;
  if (route.type === "participations")
    return <ParticipationsPage projectId={projectId} />;
  if (route.type === "step") {
    const key = route.key;
    if (key === "inventory")
      return <InventoryStep projectId={projectId} state={query.state} />;
    if (key === "framing")
      return <FramingStep projectId={projectId} question={one("question")} />;
    if (key === "confirmation")
      return <ConfirmationStep projectId={projectId} />;
    if (key === "plan") return <PlanStep projectId={projectId} />;
    // The former Suivi: the démarche its line named, else the first one
    // that waits.
    const ctx = await legalJourneyContext(projectId);
    redirect(
      demarcheTarget(projectId, ctx.demarches, "tracking", one("ligne")),
    );
  }

  const ctx = await legalJourneyContext(projectId);
  if (route.key !== "history")
    redirect(
      demarcheTarget(projectId, ctx.demarches, route.key, one("emprunt")),
    );
  const history = await loadLegalHistory(ctx.project, ctx.access);
  return (
    <HistoryView
      projectId={projectId}
      history={history}
      filter={{
        branch: isHistoryBranch(query.branche) ? query.branche : null,
        person: one("par"),
        month: isMonth(query.mois) ? query.mois : null,
      }}
    />
  );
}
