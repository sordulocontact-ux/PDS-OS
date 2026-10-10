import { notFound, redirect } from "next/navigation";

import { ConceptionTabs } from "@/components/design/conception-tabs";
import { DesignNeedsStrategy } from "@/components/design/design-needs-strategy";
import { DirectionSubmitForm } from "@/components/design/direction/direction-submit-form";
import { ValidationModeField } from "@/components/design/direction/validation-mode-field";
import { VersionCard } from "@/components/design/direction/version-card";
import { ResponsiblePicker } from "@/components/design/people/responsible-picker";
import { ValidatorsPicker } from "@/components/design/people/validators-picker";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { loadConception } from "@/lib/design/conception";
import { loadDirection } from "@/lib/design/direction";
import { directionSummary, hasContent } from "@/lib/design/direction-summary";
import { loadDesignPeople } from "@/lib/design/people";
import { directionState } from "@/lib/design/states";
import { fr } from "@/lib/i18n/fr";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { isStageValidated } from "@/lib/projects/types";
import { designReviewTone } from "@/lib/ui/state-tones";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.conceptionDirection.title} · ${fr.app.name}`,
};

/**
 * The artistic direction (ticket « Conception » § 7): who prepares it and
 * who decides, the synthesis of what would leave, the sections the
 * responsible submits, then every version with its decisions.
 */
export default async function DesignDirectionPage({
  params,
}: PageProps<"/app/projects/[projectId]/design/direction">) {
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
  const data = await loadConception(project, access);
  if (!data) notFound();
  if (!data.started) redirect(routes.projectDesign(projectId));
  const people = await loadDesignPeople(projectId, data.organizationId, access);
  const direction = await loadDirection(projectId, people.members);

  const t = fr.conceptionDirection;
  const me = access.personId;
  const scope = people.direction;
  const inProgress = data.stage?.state === "in_progress";
  const isResponsible = scope.responsible?.personId === me;
  const canSubmit = inProgress && (data.isOwner || isResponsible);
  const latest = direction.submissions[0] ?? null;
  const sections = directionSummary({
    ...data,
    confirmations: direction.confirmations,
  });
  const state = directionState({
    hasResponsible: Boolean(scope.responsible),
    hasValidators: scope.validators.length > 0,
    hasContent: sections.some(hasContent),
    latest,
  });
  const globalMissing = [
    ...(scope.responsible ? [] : [t.summary.globalMissing.responsible]),
    ...(scope.validators.length ? [] : [t.summary.globalMissing.validators]),
  ];
  const blocked =
    latest?.status === "pending"
      ? t.summary.pending
      : scope.validators.length === 0
        ? t.summary.globalMissing.validators
        : null;
  const isValidator = scope.validators.some((v) => v.personId === me);

  return (
    <div className="flex flex-col gap-10 pt-6">
      <ConceptionTabs projectId={projectId} />
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-display-sm font-semibold">{t.title}</h2>
          <StatusBadge tone={designReviewTone[state]}>
            {fr.conception.directionStates[state]}
          </StatusBadge>
        </div>
        <p className="max-w-prose text-body-md text-muted-foreground">
          {!inProgress ? t.locked : canSubmit ? t.intro : t.readOnly}
        </p>
      </header>

      <PageSection
        id="direction-people"
        title={t.people.title}
        description={t.people.description}
        card
      >
        <div className="flex flex-col gap-6">
          <ResponsiblePicker
            projectId={projectId}
            scope="direction"
            sheetId={null}
            current={scope.responsible}
            members={people.members}
            suggestions={people.suggestions}
            canAssign={data.isOwner && inProgress}
          />
          <ValidatorsPicker
            projectId={projectId}
            scope="direction"
            sheetId={null}
            validators={scope.validators}
            members={people.members}
            canEdit={data.isOwner && inProgress}
          />
          <ValidationModeField
            projectId={projectId}
            mode={direction.mode}
            canEdit={data.isOwner && inProgress}
          />
        </div>
      </PageSection>

      <PageSection
        id="direction-summary"
        title={t.summary.title}
        description={t.summary.description}
      >
        <DirectionSubmitForm
          projectId={projectId}
          sections={sections}
          canSubmit={canSubmit}
          blocked={blocked}
          globalMissing={globalMissing}
          validatorNames={scope.validators.map((v) => v.name).join(", ")}
          modeLabel={fr.conception.validationModes[direction.mode]}
        />
      </PageSection>

      <PageSection
        id="direction-versions"
        title={t.versions.title}
        description={t.versions.description}
      >
        {direction.submissions.length ? (
          <ul className="flex flex-col gap-3">
            {direction.submissions.map((s, index) => (
              <li key={s.id}>
                <VersionCard
                  projectId={projectId}
                  submission={s}
                  isValidator={isValidator}
                  open={index === 0}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyNote>{t.versions.empty}</EmptyNote>
        )}
      </PageSection>
    </div>
  );
}
