import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { loadClearances } from "@/lib/legal/clearance/queries";
import { loadConfirmation } from "@/lib/legal/confirmation/queries";
import { loadAgreements } from "@/lib/legal/contracts/queries";
import { loadTemplateRequests } from "@/lib/legal/contracts/template-requests";
import { withInvoices } from "@/lib/legal/invoices/journey";
import { loadInvoiceStates } from "@/lib/invoices/states";
import {
  launchedDemarches,
  proposedDemarches,
  type DemarcheContext,
} from "@/lib/legal/demarches/build";
import { loadFormalities } from "@/lib/legal/formalities/queries";
import { loadForms } from "@/lib/legal/forms/queries";
import { loadIntake } from "@/lib/legal/intake/queries";
import { loadLegalInventory } from "@/lib/legal/inventory";
import { legalJourney } from "@/lib/legal/journey";
import { planBoard } from "@/lib/legal/plan/board";
import { legalReadiness } from "@/lib/legal/readiness/controls";
import { loadReadinessInputs } from "@/lib/legal/readiness/queries";
import { loadLegalPlan, proposeLegalPlan } from "@/lib/legal/plan/queries";
import { loadSplits } from "@/lib/legal/splits/queries";
import { loadTracking } from "@/lib/legal/tracking/queries";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { personName } from "@/lib/projects/types";
import { listValidatorRows } from "@/lib/framing/related";
import { allInOrder } from "@/lib/utils/parallel";

/** The direction's name when exactly one member validates (« Claire
 * Morel »), else none (« La direction »). */
async function validatorName(organizationId: string | null) {
  if (!organizationId) return null;
  const { data, error } = await listValidatorRows(organizationId);
  if (error) console.error("legal validatorName:", error.message);
  return data && data.length === 1
    ? personName(data[0].first_name, data[0].last_name)
    : null;
}

/**
 * Everything the Juridique's steps share, read once per request: access,
 * the project, what each step of the Dossier recorded, each démarche's
 * sources (fiches, agreements, splits, borrowings, bulletins) and the
 * journey for the viewer (lib/legal/journey.ts). 404 without manage_legal,
 * like every page of the section. Read only: nothing is generated here.
 */
export const legalJourneyContext = cache(async (projectId: string) => {
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  if (!can(access, "manage_legal")) notFound();
  const viewerName =
    personName(access.firstName ?? "", access.lastName ?? "") || null;
  const [
    intake,
    inventory,
    confirmation,
    plan,
    tracking,
    forms,
    agreements,
    splits,
    clearances,
    formalities,
    direction,
    templateRequests,
    invoiceStates,
  ] = await Promise.all([
    loadIntake(project),
    loadLegalInventory(project, access),
    loadConfirmation(project, access),
    loadLegalPlan(project, access),
    loadTracking(project, access),
    loadForms(project, access),
    loadAgreements(project, access),
    loadSplits(project, access),
    loadClearances(project, access),
    loadFormalities(project, access),
    validatorName(access.organizationId),
    loadTemplateRequests(projectId),
    loadInvoiceStates(projectId),
  ]);
  const ownerPerson = project.ownerPersonId
    ? { personId: project.ownerPersonId, name: project.ownerName ?? "—" }
    : { personId: access.personId, name: viewerName };
  const ctx: DemarcheContext = {
    projectId,
    viewer: {
      personId: access.personId,
      name: viewerName,
      canValidate: clearances.canValidate,
    },
    owner: ownerPerson,
    validatorName: direction,
  };
  const board =
    tracking.state === "tracking"
      ? planBoard({
          projectId,
          items: tracking.items,
          forms,
          agreements: agreements.rows,
          mappingApproved: agreements.approval !== null,
          splits,
          clearances: clearances.items,
          formalities,
          canValidate: clearances.canValidate,
        })
      : null;
  const built = board
    ? launchedDemarches({ board, forms, ctx })
    : proposedDemarches({
        items:
          plan.state === "proposal"
            ? plan.items
            : await proposeLegalPlan(project, access),
        ctx,
      });
  // A signed contract's invoice: deposited by the person, paid by the
  // direction (J10).
  const demarches = withInvoices(
    built,
    invoiceStates,
    {
      name: viewerName ?? fr.legalDemarches.direction,
      canValidate: clearances.canValidate,
    },
    direction ?? fr.legalDemarches.direction,
  );
  // « Prêt pour la sortie », once the plan is launched (ticket 08).
  const readiness = board
    ? legalReadiness({
        ...(await loadReadinessInputs(project, access)),
        demarches,
        direction: direction ?? fr.legalDemarches.direction,
        invoices: invoiceStates,
        projectId,
      })
    : null;
  const steps = legalJourney({
    projectId,
    owner: {
      name: ownerPerson.name ?? "—",
      viewer: ownerPerson.personId === access.personId,
      viaLink: false,
    },
    ownerRole: fr.legalJourney.owner,
    inventory: {
      known: inventory.counts.known,
      toConfirm: inventory.counts.to_confirm,
      missing: inventory.counts.missing,
    },
    questions: {
      total: intake.questions.length,
      answered: intake.questions.filter((q) => q.answered).length,
    },
    confirmation: {
      status: confirmation.status,
      reopened: confirmation.reopened,
    },
    plan: {
      launched: plan.state === "launched",
      items: plan.state === "launched" ? plan.items.length : 0,
      contractsToConfirm: agreements.rows.some(
        (r) => r.contactId && !r.contract && r.state === "unmapped",
      ),
      // Templates asked of the direction: its decision, in this step.
      templatesToValidate: templateRequests
        .filter((r) => r.status === "draft")
        .map((r) => r.name),
    },
    demarches: demarches.map((d) => d.step),
    ready: readiness
      ? {
          verdict: readiness.verdict,
          blocking: readiness.blocking.length,
          validated: readiness.validated,
          delivered: readiness.deliveredOn !== null,
          viewer: {
            name: viewerName ?? fr.legalDemarches.direction,
            canValidate: clearances.canValidate,
          },
        }
      : null,
    direction,
    viewer: {
      name: viewerName ?? fr.legalDemarches.direction,
      canValidate: clearances.canValidate,
    },
  });
  return {
    access,
    project,
    intake,
    inventory,
    confirmation,
    plan,
    tracking,
    forms,
    agreements,
    splits,
    clearances,
    formalities,
    board,
    demarches,
    readiness,
    steps,
    viewerName,
    direction,
    templateRequests,
  };
});
