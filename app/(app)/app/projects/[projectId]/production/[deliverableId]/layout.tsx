import { ProjectHeader } from "@/components/projects/project-header";
import { TitleScopeLine } from "@/components/projects/titles/title-scope";
import { requireApproved } from "@/lib/auth/dal";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { loadTitleScopes, scopeOf } from "@/lib/projects/title-scopes";
import {
  DeliverableBar,
  deliverableLine,
} from "@/components/production/journey/deliverable-bar";
import { ContactLinksSection } from "@/components/portal/contact-links-section";
import { ProductionWhoDoesWhatButton } from "@/components/production/journey/who-does-what";
import {
  SheetKindBadge,
  SheetNotices,
  sheetFacts,
} from "@/components/production/prep/sheet-header";
import { JourneyLayout } from "@/components/shell/journey/journey-layout";
import { JourneySpine } from "@/components/shell/journey/journey-spine";
import { ModuleAttention } from "@/components/shell/module/module-attention";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { productionDeliverables } from "@/lib/journey/production";
import { journeyContext } from "@/lib/production/journey/context";
import { loadProductionHistory } from "@/lib/production/history";
import {
  productionStepChoices,
  productionStepRef,
} from "@/lib/production/journey/step-ref";
import { loadProviderLinks } from "@/lib/production/post/requests";
import { loadRevokedLinks } from "@/lib/production/producer-history";
import { projectHeaderData } from "@/lib/projects/header";
import { createClient } from "@/lib/supabase/server";

// One deliverable's production as a journey (Ibé, 14/10; JourneyLayout,
// docs/VISION-UX.md § 4): the steps on the left; on their right the head
// (trail « Projet › Marketing › Production › livrable › étape » in the top
// bar, h1 = the open step's title, read from the URL, its why, who
// produces, « Qui fait quoi », what frames it), the points to look at, the
// bar of the deliverables in Production, then the open step — one page per
// step. Before it starts, the page alone in full width. Pages check access
// themselves; everything is read once per request (journeyContext is
// cached).
export default async function ProductionSheetLayout({
  children,
  params,
}: LayoutProps<"/app/projects/[projectId]/production/[deliverableId]">) {
  const { projectId, deliverableId } = await params;
  const [{ data, steps }, deliverables, scopes, access, project] =
    await Promise.all([
      journeyContext(projectId, deliverableId),
      productionDeliverables(projectId),
      loadTitleScopes(projectId),
      requireApproved(),
      requireLaunchedProject(projectId),
    ]);
  const started = Boolean(data.heritage.fiche || data.heritage.source);
  const sheet = data.sheet;
  const organized = Boolean(sheet?.organization.kind);
  const [links, history, revoked] = sheet
    ? await Promise.all([
        loadProviderLinks(await createClient(), sheet.id),
        loadProductionHistory(sheet.id, data, [
          "sheet.organized",
          "link.sent",
          "link.revoked",
        ]),
        loadRevokedLinks(sheet.id),
      ])
    : [{}, [], {}];
  // The creative side, as the journey resolved it (direction's coordinator).
  const creativeName =
    steps
      .find((s) => s.key === "direction")
      ?.roles?.find((x) => x.kind === "coord")?.name ??
    // A light journey: who validates its versions.
    steps
      .find((s) => s.key === "post")
      ?.roles?.find((x) => x.role === fr.productionJourney.roles.creativeInt)
      ?.name ??
    null;
  // Once organized, the sheet's facts and the release (read with the header).
  const facts = projectHeaderData(projectId).then((header) => {
    const release = header?.facts.find((f) => f.key === "release");
    return [...sheetFacts(data), ...(release ? [release] : [])];
  });
  const head = (
    <>
      <ProjectHeader
        projectId={projectId}
        extraCrumbs={[
          {
            label: data.deliverable.title,
            href: routes.projectProductionSheet(projectId, deliverableId),
            // The other deliverables in Production, from the trail (Sacha
            // 10/11/2026, like the activations).
            options: deliverables.map((d) => ({
              key: d.id,
              label: d.title,
              href: routes.projectProductionSheet(projectId, d.id),
              detail: deliverableLine(d),
              current: d.id === deliverableId,
            })),
          },
        ]}
        steps={steps}
        head={started ? "path" : undefined}
        actions={
          <>
            {organized && <SheetKindBadge data={data} />}
            <ProductionWhoDoesWhatButton
              projectId={projectId}
              data={data}
              links={links}
              revoked={revoked}
              creativeName={creativeName}
              canOrganize={data.canOrganize}
              history={history}
              personLinks={
                <ContactLinksSection
                  projectId={projectId}
                  sub={Object.keys(links).length > 0}
                />
              }
            />
          </>
        }
        // Before « Qui produit ? », the project's own facts (proto).
        facts={organized ? facts : undefined}
      />
      {/* A collective: the titles the deliverable targets (lot 10). */}
      {scopes && (
        <TitleScopeLine
          action={{
            projectId,
            deliverableId,
            name: data.deliverable.title,
          }}
          scope={scopeOf(scopes.deliverables, deliverableId)}
          titles={scopes.titles}
          canEdit={canEditProject(access, project)}
        />
      )}
      <SheetNotices data={data} />
      <ModuleAttention
        stepRef={productionStepRef(projectId, deliverableId, "organisation")}
        modules={["production"]}
        steps={productionStepChoices(deliverableId, steps)}
      />
      <DeliverableBar projectId={projectId} current={deliverableId} />
    </>
  );
  if (!started)
    return (
      <div className="flex flex-col gap-5">
        {head}
        {children}
      </div>
    );
  return (
    <JourneyLayout
      spine={
        <JourneySpine
          steps={steps}
          footer={{
            href: routes.projectProductionStep(
              projectId,
              deliverableId,
              "history",
            ),
            label: fr.productionJourney.history,
          }}
        />
      }
      head={head}
    >
      {children}
    </JourneyLayout>
  );
}
