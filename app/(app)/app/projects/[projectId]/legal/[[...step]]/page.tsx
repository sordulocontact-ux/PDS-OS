import { notFound, redirect } from "next/navigation";

import { WorkflowLocked } from "@/components/plan/workflow-locked";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { isWorkflowLaunched, workflowGate } from "@/lib/plan/queries";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

import { AttachTitleStep } from "@/components/legal/steps/attach-title-step";
import { ConfirmationStep } from "@/components/legal/steps/confirmation-step";
import { DemarcheStep } from "@/components/legal/steps/demarche-step";
import { FramingStep } from "@/components/legal/steps/framing-step";
import { InventoryStep } from "@/components/legal/steps/inventory-step";
import { PlanStep } from "@/components/legal/steps/plan-step";
import { ReadyStep } from "@/components/legal/steps/ready-step";
import { TitleContractsStep } from "@/components/legal/steps/title-contracts-step";
import { demarcheTarget, entryHref } from "@/lib/legal/demarches/where";
import { legalJourneyContext } from "@/lib/legal/journey-context";
import { legalParticipationsHref, legalRouteOf } from "@/lib/ui/legal-steps";

// The Juridique as a journey (docs/VISION-UX.md § 4, proto « Projet
// complet »): /legal redirects to the step that awaits the viewer; the
// Dossier's steps (/legal/inventory, /framing, /confirmation, /plan), one
// step per démarche (/legal/person/<ref>, /clearance/<id>, /split/<title>,
// /sacem/<title>), a collective's title to attach to the Catalogue
// (/legal/attach/<title>), its contracts (/legal/title-contracts/<title>)
// and « Prêt pour la sortie » (/legal/ready) share
// the guided frame. The former Suivi and branch pages (/legal/tracking, /forms,
// /contracts, /splits, /clearances, /formalities) redirect to the démarche
// they were about: notifications and tasks keep working. Reserved to
// manage_legal: anyone else gets the same 404 as a missing page.
/** The Juridique waits for the Plan du Projet (docs/ARCHITECTURE.md § 6
 * ter): launched from the plan, or already begun before it existed. Without
 * manage_legal the page itself answers 404. */
async function legalLock(projectId: string) {
  // Launched (the common case): no round of its own before the pages.
  const [access, project, launched] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
    isWorkflowLaunched(projectId, "legal"),
  ]);
  if (!can(access, "manage_legal") || launched) return null;
  const gate = await workflowGate(project, "legal");
  return gate ? <WorkflowLocked projectId={projectId} gate={gate} /> : null;
}

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
  // A collective's participations, their contracts and deals: not behind
  // the Juridique's launch (lots 11 and 12).
  if (legalRouteOf(step)?.type !== "participations") {
    const locked = await legalLock(projectId);
    if (locked) return locked;
  }
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
        // A collective: the title whose journey shows it.
        titre={one("titre")}
      />
    );
  if (route.type === "ready") return <ReadyStep projectId={projectId} />;
  // A panel over « Titres » since 27/11/2026: former links land there.
  if (route.type === "participations")
    redirect(legalParticipationsHref(projectId));
  // A collective's title not in the Catalogue yet (Ibé, 18/11/2026).
  if (route.type === "attach")
    return <AttachTitleStep projectId={projectId} titleId={route.titleId} />;
  // The contracts a collective's title needs (Ibé, 18/11/2026, § 3.4).
  if (route.type === "titleContracts")
    return <TitleContractsStep projectId={projectId} titleId={route.titleId} />;
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
  redirect(demarcheTarget(projectId, ctx.demarches, route.key, one("emprunt")));
}
