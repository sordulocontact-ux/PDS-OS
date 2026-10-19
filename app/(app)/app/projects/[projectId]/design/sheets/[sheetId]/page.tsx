import { notFound, redirect } from "next/navigation";

import { ConceptionTabs } from "@/components/design/conception-tabs";
import { DesignNeedsStrategy } from "@/components/design/design-needs-strategy";
import { DelegationsPanel } from "@/components/design/roles/delegations-panel";
import { DesignRoles } from "@/components/design/roles/design-roles";
import { SheetChecksPanel } from "@/components/design/sheets/sheet-checks-panel";
import { SheetForm } from "@/components/design/sheets/sheet-form";
import { SheetHeader } from "@/components/design/sheets/sheet-header";
import { SheetHistory } from "@/components/design/sheets/sheet-history";
import { SeriesTracking } from "@/components/design/sheets/series-tracking";
import { SheetItems } from "@/components/design/sheets/sheet-items";
import { SheetReferences } from "@/components/design/sheets/sheet-references";
import { SheetReview } from "@/components/design/sheets/sheet-review";
import { SheetView } from "@/components/design/sheets/sheet-view";
import { PageSection } from "@/components/shell/page-section";
import { ToneCallout } from "@/components/ui/tone-callout";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { delegatedTo, loadDesignRoles } from "@/lib/design/delegations";
import { loadReferenceViews } from "@/lib/design/references";
import { todayInParis } from "@/lib/insights/dates";
import { toFormInput } from "@/lib/design/sheet-form";
import { loadSheetEvents } from "@/lib/design/sheet-summaries";
import { loadSheetsPage } from "@/lib/design/sheets-page";
import { fr } from "@/lib/i18n/fr";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { isStageValidated } from "@/lib/projects/types";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.conception.sheetTitle} · ${fr.app.name}`,
};

/**
 * One Fiche Livrable (ticket « Conception » § 10 à 13): what must be
 * delivered, with the provenance of every value; what PO points out before
 * submitting; validation version by version; the handoff to Production.
 */
export default async function DesignSheetPage({
  params,
}: PageProps<"/app/projects/[projectId]/design/sheets/[sheetId]">) {
  const { projectId, sheetId } = await params;
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
  const page = await loadSheetsPage(project, access, sheetId);
  if (!page) notFound();
  const { data, people, sheets } = page;
  if (!data.started) redirect(routes.projectDesign(projectId));
  const s = sheets[0];
  if (!s) notFound();
  const deliverable =
    data.deliverables.find((d) => d.id === s.sheet.design_deliverable_id) ??
    null;
  const [events, references, roles] = await Promise.all([
    loadSheetEvents(projectId, sheetId),
    loadReferenceViews(
      projectId,
      data.references.filter((r) =>
        r.links.some((l) => l.deliverableId === s.sheet.design_deliverable_id),
      ),
    ),
    loadDesignRoles(projectId, people.members),
  ]);

  const t = fr.conceptionSheet;
  const me = access.personId;
  const scope = people.sheets[sheetId] ?? { responsible: null, validators: [] };
  const inProgress = data.stage?.state === "in_progress";
  // MKT-C2-08: a delegation acts as the role it hands over.
  const isResponsible =
    (me !== null && scope.responsible?.personId === me) ||
    delegatedTo(roles, me, "sheet", sheetId, "responsible");
  const canWrite = inProgress && (data.isOwner || isResponsible);
  const canEdit = canWrite && s.status !== "pending";
  const isValidator =
    scope.validators.some((v) => v.personId === me) ||
    delegatedTo(roles, me, "sheet", sheetId, "validator");
  const substitute =
    data.isOwner && inProgress && scope.responsible && !isResponsible
      ? scope.responsible.name
      : null;
  const names = new Map(people.members.map((m) => [m.personId, m.name]));
  const nameOf = (id: string | null) => (id ? (names.get(id) ?? "") : "");
  const intentions = data.intentions.filter(
    (i) =>
      i.status === "confirmed" &&
      i.deliverableId === s.sheet.design_deliverable_id,
  );
  // MKT-C2-06: what the deliverable takes from the release's direction.
  const inherited = data.intentions.filter(
    (i) =>
      i.status === "confirmed" &&
      i.target === "direction" &&
      !intentions.some((own) => own.topic === i.topic),
  );
  const latest = s.versions[0];
  const decisionOf = (itemId: string) =>
    latest?.decisions.find((d) => d.section === itemId)?.decision ?? null;

  return (
    <div className="flex flex-col gap-10 pt-6">
      <ConceptionTabs projectId={projectId} />
      <SheetHeader
        sheet={{
          id: s.sheet.id,
          title: s.sheet.title,
          kind: s.sheet.kind,
          items: s.items.length,
        }}
        projectTitle={project.title}
        deliverable={deliverable}
        status={s.status}
        version={latest?.number ?? null}
      />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-8">
          {!canEdit && (
            <p className="text-body-md text-muted-foreground">
              {s.status === "pending" ? t.frozen : t.readOnly}
            </p>
          )}
          {substitute && canEdit && (
            <ToneCallout tone="info">
              {fr.conceptionRoles.substitution(substitute)}
            </ToneCallout>
          )}
          <PageSection id="sheet-intentions" title={t.sections.intentions} card>
            {intentions.length || inherited.length ? (
              <ul className="flex flex-col gap-2 text-body-md">
                {intentions.map((i) => (
                  <li key={i.id}>
                    <span className="text-muted-foreground">
                      {fr.conception.topics[i.topic]} :{" "}
                    </span>
                    {i.value}
                  </li>
                ))}
                {inherited.map((i) => (
                  <li key={i.id}>
                    <span className="text-muted-foreground">
                      {t.inheritedTopic(fr.conception.topics[i.topic])} :{" "}
                    </span>
                    {i.value}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body-md text-muted-foreground">
                {t.intentions.empty}
              </p>
            )}
          </PageSection>
          {canEdit ? (
            <SheetForm
              key={s.sheet.updated_at}
              projectId={projectId}
              sheetId={sheetId}
              initial={toFormInput(s.sheet)}
              provenance={s.provenance}
            />
          ) : (
            <SheetView sheet={s.sheet} provenance={s.provenance} />
          )}
          {s.sheet.kind === "series" && (
            <PageSection id="sheet-items" title={t.sections.items} card>
              <div className="flex flex-col gap-6">
                <SeriesTracking
                  projectId={projectId}
                  sheetId={sheetId}
                  tracking={
                    s.sheet.tracking === "global" ||
                    s.sheet.tracking === "per_item"
                      ? s.sheet.tracking
                      : null
                  }
                  canEdit={canEdit}
                />
                <SheetItems
                  projectId={projectId}
                  sheetId={sheetId}
                  canEdit={canEdit}
                  members={people.members}
                  items={s.items.map((i) => ({
                    id: i.id,
                    number: i.number,
                    title: i.title,
                    objective: i.objective,
                    deliveryDate: i.delivery_date,
                    notes: i.notes,
                    responsiblePersonId: i.responsible_person_id,
                    responsibleName: i.responsible_person_id
                      ? nameOf(i.responsible_person_id)
                      : null,
                    concept: i.concept,
                    referenceUrl: i.reference_url,
                    decision: decisionOf(i.id),
                  }))}
                />
              </div>
            </PageSection>
          )}
          <PageSection id="sheet-references" title={t.sections.references} card>
            <SheetReferences references={references} />
          </PageSection>
        </div>

        <aside className="flex flex-col gap-8 self-start">
          <PageSection id="sheet-people" title={t.sections.people} card>
            <div className="flex flex-col gap-6">
              <DesignRoles
                projectId={projectId}
                scope="sheet"
                sheetId={sheetId}
                people={scope}
                ownerName={project.ownerName}
                members={people.members}
                suggestions={people.suggestions}
                canAssign={data.isOwner && inProgress}
                canEditValidators={
                  data.isOwner && inProgress && s.status !== "pending"
                }
                responsibleLabel={t.people.responsible}
              />
              <DelegationsPanel
                projectId={projectId}
                scope="sheet"
                sheetId={sheetId}
                delegations={roles.delegations.filter(
                  (d) => d.sheetId === sheetId,
                )}
                responsible={scope.responsible}
                validators={scope.validators}
                members={people.members}
                canManage={data.isOwner && inProgress}
                today={todayInParis()}
              />
            </div>
          </PageSection>
          <PageSection id="sheet-checks-section" title={t.sections.checks} card>
            <SheetChecksPanel checks={s.checks} />
          </PageSection>
          <PageSection id="sheet-review" title={t.sections.review} card>
            <SheetReview
              projectId={projectId}
              sheet={s}
              canSubmit={canWrite}
              isOwner={data.isOwner}
              isValidator={isValidator}
              nameOf={nameOf}
              blockedSelf={roles.allowSelfApproval ? null : me}
              validatorNames={scope.validators.map((v) => v.name).join(", ")}
              today={todayInParis()}
            />
          </PageSection>
          <PageSection id="sheet-history" title={t.sections.history} card>
            <SheetHistory events={events} nameOf={nameOf} />
          </PageSection>
        </aside>
      </div>
    </div>
  );
}
