import { IconBox2 } from "nucleo-sharp-essential";
import { notFound } from "next/navigation";

import { ProductionBriefSection } from "@/components/production/prep/brief-section";
import { ProductionCallPanel } from "@/components/production/prep/production-call-sheet";
import { ProductionImportButton } from "@/components/production/prep/import-dialog";
import { HeritageSection } from "@/components/production/prep/heritage-section";
import { ProductionNeedsSection } from "@/components/production/prep/needs-section";
import { ModePicker } from "@/components/production/prep/mode-picker";
import { ModeSummary } from "@/components/production/prep/mode-summary";
import { EmptyState } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { buttonVariants } from "@/components/ui/button";
import { ViewLink } from "@/components/ui/view-link";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { loadProductionCalls } from "@/lib/production/call-queries";
import { loadProductionSheet } from "@/lib/production/sheet";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

const t = fr.productionPrep;

export const metadata = { title: `${t.title} · ${fr.app.name}` };

/**
 * Marketing › Production › one deliverable (ticket « Workflow Production
 * complet », parcours 1 à 3): opened from its validated Fiche Livrable, it
 * shows what Conception decided, the organisation chosen, the director's
 * brief and the teams. Written by the owner (the brief also by a designated
 * director who is a member) while the « production » stage runs.
 */
export default async function ProductionSheetPage({
  params,
}: PageProps<"/app/projects/[projectId]/production/[deliverableId]">) {
  const { projectId, deliverableId } = await params;
  const [access] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const data = await loadProductionSheet(projectId, deliverableId, access);
  if (!data) notFound();

  if (!data.heritage.fiche && !data.heritage.source)
    return (
      <EmptyState
        icon={IconBox2}
        title={t.notValidatedTitle}
        body={t.notValidated}
        action={
          <ViewLink
            href={routes.projectDesign(projectId)}
            className={buttonVariants({ variant: "outline" })}
          >
            {t.toConception}
          </ViewLink>
        }
      />
    );

  const sheet = data.sheet;
  const calls = await loadProductionCalls(projectId, sheet?.id ?? null);
  const status =
    data.stageState !== "in_progress" && data.stageState !== "not_started"
      ? t.locked
      : !data.canOpen && !data.canWriteBrief
        ? t.readOnly
        : null;

  return (
    <div className="flex flex-col gap-10">
      {status && <p className="text-sm text-muted-foreground">{status}</p>}

      <HeritageSection data={data} />

      {!sheet ? (
        data.canOpen && (
          <PageSection
            id="organisation"
            title={t.modes.title}
            description={t.modes.description}
          >
            <ModePicker
              projectId={projectId}
              deliverableId={deliverableId}
              current={null}
            />
          </PageSection>
        )
      ) : (
        <>
          <ModeSummary
            projectId={projectId}
            deliverableId={deliverableId}
            mode={sheet.mode}
            canChange={data.canOrganize}
          />
          {sheet.mode === "import" && (
            <ProductionImportButton
              projectId={projectId}
              sheetId={sheet.id}
              brief={sheet.brief}
              canOrganize={data.canOrganize}
            />
          )}
          {(sheet.mode === "call" || calls.length > 0) && (
            <ProductionCallPanel
              projectId={projectId}
              data={data}
              calls={calls}
              canOrganize={data.canOrganize}
            />
          )}
          <ProductionBriefSection
            projectId={projectId}
            sheet={sheet}
            canWriteBrief={data.canWriteBrief}
            canOrganize={data.canOrganize}
            members={data.members}
            contacts={data.contacts}
          />
          <ProductionNeedsSection
            projectId={projectId}
            sheetId={sheet.id}
            needs={data.needs}
            director={sheet.director}
            choices={sheet.brief}
            canOrganize={data.canOrganize}
            members={data.members}
            contacts={data.contacts}
          />
        </>
      )}
    </div>
  );
}
