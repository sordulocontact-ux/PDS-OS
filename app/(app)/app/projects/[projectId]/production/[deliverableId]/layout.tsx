import { notFound } from "next/navigation";

import { SheetHeader } from "@/components/production/prep/sheet-header";
import { SectionTabs } from "@/components/shell/section-tabs";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { loadPhaseFacts, phaseOf } from "@/lib/production/phase";
import { loadProductionSheet } from "@/lib/production/sheet";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import { allInOrder } from "@/lib/utils/parallel";

const t = fr.productionPrep;

// One deliverable's production: its header (source, phase) and one tab per
// part of the ticket, each its own URL. The tabs other than Préparation
// appear once the preparation is opened. Pages check access themselves; the
// sheet is read once per request (loadProductionSheet is cached).
export default async function ProductionSheetLayout({
  children,
  params,
}: LayoutProps<"/app/projects/[projectId]/production/[deliverableId]">) {
  const { projectId, deliverableId } = await params;
  const [access] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const data = await loadProductionSheet(projectId, deliverableId, access);
  if (!data) notFound();
  const facts = await loadPhaseFacts(
    await createClient(),
    data.sheet ? { id: data.sheet.id, readyAt: data.sheet.readyAt } : null,
    deliverableId,
  );
  const step = (key: string) =>
    routes.projectProductionStep(projectId, deliverableId, key);

  return (
    <div className="flex flex-col gap-6 pt-6">
      <SheetHeader projectId={projectId} data={data} phase={phaseOf(facts)} />
      {data.sheet && (
        <SectionTabs
          label={t.tabsLabel}
          tabs={[
            {
              href: routes.projectProductionSheet(projectId, deliverableId),
              label: t.tabs.preparation,
              exact: true,
            },
            { href: step("preproduction"), label: t.tabs.preproduction },
            { href: step("shoot"), label: t.tabs.shoot },
            { href: step("post"), label: t.tabs.post },
            { href: step("delivery"), label: t.tabs.delivery },
          ]}
        />
      )}
      {children}
    </div>
  );
}
