import Link from "next/link";
import { IconScale } from "nucleo-sharp-essential";

import { PlanForm } from "@/components/legal/plan/plan-form";
import { ProjectPageHeader } from "@/components/projects/project-page-header";
import { EmptyNote, EmptyState } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { PLAN_COLUMNS } from "@/lib/legal/plan/proposal";
import type { LegalPlan, PlanRow } from "@/lib/legal/plan/queries";
import { formatDate, formatDateTime } from "@/lib/release/format";
import { planItemTone } from "@/lib/ui/state-tones";

/** Juridique's fourth step: the plan to launch, or the plan launched. */
export function PlanView({
  projectId,
  plan,
}: {
  projectId: string;
  plan: LegalPlan;
}) {
  const t = fr.legal.plan;
  const header = (
    <ProjectPageHeader title={t.title} description={t.description} />
  );

  if (plan.state === "needs_confirmation")
    return (
      <div className="grid gap-8">
        {header}
        <EmptyState
          icon={IconScale}
          title={t.needsConfirmation.title}
          body={t.needsConfirmation.body}
          action={
            <Button
              nativeButton={false}
              render={
                <Link
                  href={routes.projectLegalStep(projectId, "confirmation")}
                />
              }
            >
              {t.needsConfirmation.action}
            </Button>
          }
        />
      </div>
    );

  if (plan.state === "proposal")
    return (
      <div className="grid gap-8">
        {header}
        <PlanForm
          projectId={projectId}
          items={plan.items}
          people={plan.people}
        />
      </div>
    );

  return (
    <div className="grid gap-8">
      {header}
      <ToneCallout tone="success">
        {t.launched(formatDateTime(plan.launchedAt), plan.launchedBy)}{" "}
        <Link
          href={routes.projectLegalStep(projectId, "tracking")}
          className="underline underline-offset-4"
        >
          {t.openTracking}
        </Link>
      </ToneCallout>
      {PLAN_COLUMNS.map((column) => (
        <PageSection
          key={column}
          card
          id={`legal-plan-${column}`}
          title={t.columns[column].title}
          description={t.columns[column].description}
        >
          <LaunchedRows
            items={plan.items.filter((item) => item.column === column)}
            labelOf={new Map(plan.items.map((i) => [i.key, i.label]))}
          />
        </PageSection>
      ))}
    </div>
  );
}

function LaunchedRows({
  items,
  labelOf,
}: {
  items: PlanRow[];
  labelOf: Map<string, string>;
}) {
  const t = fr.legal.plan;
  if (items.length === 0) return <EmptyNote>{t.empty}</EmptyNote>;
  return (
    <ul className="flex flex-col gap-4">
      {items.map((item) => (
        <li
          key={item.key}
          className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-medium break-words">{item.label}</span>
            {item.detail && (
              <span className="text-sm break-words text-muted-foreground">
                {item.detail}
              </span>
            )}
            {item.why && (
              <span className="text-sm break-words text-muted-foreground">
                {item.why}
              </span>
            )}
            {item.dependsOn.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {t.after(
                  item.dependsOn
                    .flatMap((key) => labelOf.get(key) ?? [])
                    .join(", "),
                )}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm sm:justify-end">
            <span className="text-muted-foreground">
              {item.responsibleName ?? t.noResponsible}
              {item.dueOn && ` · ${formatDate(item.dueOn)}`}
            </span>
            <StatusBadge tone={planItemTone[item.status]}>
              {t.status[item.status]}
            </StatusBadge>
          </div>
        </li>
      ))}
    </ul>
  );
}
