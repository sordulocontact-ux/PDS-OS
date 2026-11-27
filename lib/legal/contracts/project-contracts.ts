"use server";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import type { AgreementRow } from "@/lib/legal/contracts/mapping";
import { latestRequestOf } from "@/lib/legal/contracts/template-requests";
import { legalJourneyContext } from "@/lib/legal/journey-context";
import { getProject } from "@/lib/projects/queries";

// « Partir d'un modèle » in « Nouveau contrat » (Sacha 26/11/2026: the
// contract made without leaving the modal): a project's « Contrats à
// prévoir », read as its Plan d'action reads them (legalJourneyContext), so
// the modal shows the same table, the same generation and the same template
// asked of the direction for a person without one.

export type ProjectContracts =
  // Not launched, or not the viewer's to prepare.
  | { state: "unavailable" }
  // Its legal plan is not confirmed yet: its contracts are not planned.
  | { state: "unplanned" }
  | {
      state: "ready";
      rows: AgreementRow[];
      approval: { by: string; at: string } | null;
      organizationId: string | null;
      requests: Record<
        string,
        {
          name: string;
          pending: boolean;
          refusal: { by: string; reason: string } | null;
        }
      >;
      direction: string;
    };

export async function loadProjectContracts(
  projectId: string,
): Promise<ProjectContracts> {
  const id = catalogIdSchema.safeParse(projectId);
  const access = await requireApproved();
  if (!id.success || !can(access, "manage_legal"))
    return { state: "unavailable" };
  // Checked first: the journey's own guard answers a 404.
  const project = await getProject(id.data);
  if (!project || project.stages.length === 0) return { state: "unavailable" };
  const { plan, agreements, clearances, templateRequests, direction } =
    await legalJourneyContext(id.data);
  if (plan.state === "needs_confirmation" || agreements.rows.length === 0)
    return { state: "unplanned" };
  return {
    state: "ready",
    rows: agreements.rows,
    approval: agreements.approval,
    organizationId: clearances.organizationId,
    requests: Object.fromEntries(
      [...latestRequestOf(templateRequests)].map(([key, r]) => [
        key,
        { name: r.name, pending: r.status === "draft", refusal: r.refusal },
      ]),
    ),
    direction: direction ?? fr.legalDemarches.direction,
  };
}
