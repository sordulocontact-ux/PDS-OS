import { notFound, redirect } from "next/navigation";

import { ConceptionTabs } from "@/components/design/conception-tabs";
import { DesignNeedsStrategy } from "@/components/design/design-needs-strategy";
import { SheetsTable } from "@/components/design/sheets/sheets-table";
import { EmptyNote } from "@/components/shell/empty-state";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { loadPlannedQuantities } from "@/lib/design/sheet-summaries";
import { loadSheetsPage } from "@/lib/design/sheets-page";
import { fr } from "@/lib/i18n/fr";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { isStageValidated } from "@/lib/projects/types";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.conceptionSheet.listTitle} · ${fr.app.name}`,
};

/**
 * The Fiches Livrables (ticket « Conception » § 9): one per deliverable or
 * per series, each one created by the chef de projet from the validated
 * Stratégie, then completed, validated and handed to Production on its own.
 */
export default async function DesignSheetsPage({
  params,
}: PageProps<"/app/projects/[projectId]/design/sheets">) {
  const { projectId } = await params;
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  if (!isStageValidated(project.stages, "launch_strategy"))
    return (
      <DesignNeedsStrategy
        projectId={projectId}
        canEdit={canEditProject(access, project)}
      />
    );
  const [page, planned] = await Promise.all([
    loadSheetsPage(project, access),
    loadPlannedQuantities(projectId),
  ]);
  if (!page) notFound();
  const { data, people, sheets } = page;
  if (!data.started) redirect(routes.projectDesign(projectId));

  const t = fr.conceptionSheet;
  const canCreate = data.isOwner && data.stage?.state === "in_progress";
  const rows = data.deliverables.map((d) => {
    const sheet = sheets.find((s) => s.sheet.design_deliverable_id === d.id);
    return {
      deliverableId: d.id,
      deliverableTitle: d.title,
      planned: planned[d.id] ?? null,
      sheet: sheet
        ? {
            id: sheet.sheet.id,
            title: sheet.sheet.title,
            kind: sheet.sheet.kind,
            items: sheet.items.length,
            status: sheet.status,
            responsible:
              people.sheets[sheet.sheet.id]?.responsible?.name ?? null,
            deliveryDate: sheet.sheet.delivery_date,
          }
        : null,
    };
  });

  return (
    <div className="flex flex-col gap-10 pt-6">
      <ConceptionTabs projectId={projectId} />
      <header className="flex flex-col gap-2">
        <h2 className="text-display-sm font-semibold">{t.listTitle}</h2>
        <p className="max-w-prose text-body-md text-muted-foreground">
          {t.listBody}
        </p>
      </header>
      {rows.length ? (
        <SheetsTable projectId={projectId} rows={rows} canCreate={canCreate} />
      ) : (
        <EmptyNote>{t.empty}</EmptyNote>
      )}
    </div>
  );
}
