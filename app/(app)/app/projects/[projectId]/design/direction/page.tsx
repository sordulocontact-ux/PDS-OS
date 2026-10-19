import { notFound, redirect } from "next/navigation";

import { ConceptionTabs } from "@/components/design/conception-tabs";
import { DesignNeedsStrategy } from "@/components/design/design-needs-strategy";
import { DirectionSubmitForm } from "@/components/design/direction/direction-submit-form";
import { ValidationModeField } from "@/components/design/direction/validation-mode-field";
import { VersionCard } from "@/components/design/direction/version-card";
import { DelegationsPanel } from "@/components/design/roles/delegations-panel";
import { DesignRoles } from "@/components/design/roles/design-roles";
import { RightsMatrix } from "@/components/design/roles/rights-matrix";
import { SelfApprovalSwitch } from "@/components/design/roles/self-approval-switch";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { loadConception } from "@/lib/design/conception";
import { delegatedTo, loadDesignRoles } from "@/lib/design/delegations";
import { loadDirection } from "@/lib/design/direction";
import { todayInParis } from "@/lib/insights/dates";
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
  const [direction, roles] = await Promise.all([
    loadDirection(projectId, people.members),
    loadDesignRoles(projectId, people.members),
  ]);

  const t = fr.conceptionDirection;
  const me = access.personId;
  const scope = people.direction;
  const inProgress = data.stage?.state === "in_progress";
  // MKT-C2-08: a delegation acts as the role it hands over.
  const isResponsible =
    scope.responsible?.personId === me ||
    delegatedTo(roles, me, "direction", null, "responsible");
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
  const isValidator =
    scope.validators.some((v) => v.personId === me) ||
    delegatedTo(roles, me, "direction", null, "validator");
  // The owner works in place of the designated responsible: exceptional,
  // traced (MKT-C2-08).
  const substitute =
    data.isOwner && inProgress && scope.responsible && !isResponsible
      ? scope.responsible.name
      : null;

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
        {substitute && (
          <ToneCallout tone="info">
            {fr.conceptionRoles.substitution(substitute)}
          </ToneCallout>
        )}
      </header>

      <PageSection
        id="direction-people"
        title={t.people.title}
        description={t.people.description}
        card
      >
        <div className="flex flex-col gap-6">
          <DesignRoles
            projectId={projectId}
            scope="direction"
            sheetId={null}
            people={scope}
            ownerName={project.ownerName}
            members={people.members}
            suggestions={people.suggestions}
            canAssign={data.isOwner && inProgress}
            canEditValidators={data.isOwner && inProgress}
          />
          <ValidationModeField
            projectId={projectId}
            mode={direction.mode}
            canEdit={data.isOwner && inProgress}
          />
          <DelegationsPanel
            projectId={projectId}
            scope="direction"
            sheetId={null}
            delegations={roles.delegations.filter(
              (d) => d.scope === "direction",
            )}
            responsible={scope.responsible}
            validators={scope.validators}
            members={people.members}
            canManage={data.isOwner && inProgress}
            today={todayInParis()}
          />
          <SelfApprovalSwitch
            projectId={projectId}
            allowed={roles.allowSelfApproval}
            canChange={can(access, "validate")}
          />
        </div>
      </PageSection>

      <PageSection
        id="direction-rights"
        title={fr.conceptionRoles.matrixTitle}
        collapsible
        defaultOpen={false}
      >
        <RightsMatrix />
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
          nextVersion={(direction.submissions[0]?.number ?? 0) + 1}
          today={todayInParis()}
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
                  selfSubmitted={
                    s.submittedBy === me && !roles.allowSelfApproval
                  }
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
