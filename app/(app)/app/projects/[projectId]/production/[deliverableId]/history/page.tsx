import { notFound, redirect } from "next/navigation";

import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { DayGroups } from "@/components/ui/day-groups";
import { Timestamp } from "@/components/ui/timestamp";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { loadProductionHistory } from "@/lib/production/history";
import { loadProductionSheet } from "@/lib/production/sheet";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

const t = fr.productionHistory;

/**
 * Marketing › Production › one deliverable › Historique (PROD-002,
 * PROD-008): who did what and when — statuses, responsibles, due dates,
 * checks, decisions —, each line written by code from the activity log.
 */
export default async function ProductionHistoryPage({
  params,
}: PageProps<"/app/projects/[projectId]/production/[deliverableId]/history">) {
  const { projectId, deliverableId } = await params;
  const [access] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const data = await loadProductionSheet(projectId, deliverableId, access);
  if (!data) notFound();
  if (!data.sheet)
    redirect(routes.projectProductionSheet(projectId, deliverableId));
  const lines = await loadProductionHistory(data.sheet.id, data);

  return (
    <PageSection id="history" title={t.title} description={t.description}>
      {lines.length === 0 ? (
        <EmptyNote>{t.none}</EmptyNote>
      ) : (
        <DayGroups items={lines} idPrefix="history" keyOf={(l) => l.id}>
          {(line) => (
            <p className="flex flex-wrap items-baseline gap-x-2 py-1 text-sm">
              <Timestamp
                iso={line.at}
                show="hour"
                className="w-12 shrink-0 text-muted-foreground tabular-nums"
              />
              <span className="min-w-0 flex-1 break-words">
                {line.who && <span className="font-medium">{line.who} </span>}
                {line.who ? line.text : capitalize(line.text)}
              </span>
            </p>
          )}
        </DayGroups>
      )}
    </PageSection>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
