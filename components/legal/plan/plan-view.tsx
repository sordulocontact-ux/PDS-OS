import Link from "next/link";
import { IconScale } from "nucleo-sharp-essential";

import { ActionGroup } from "@/components/legal/plan/action-group";
import { PlanForm } from "@/components/legal/plan/plan-form";
import { EmptyNote, EmptyState } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { Button } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { legal } from "@/lib/i18n/fr/legal";
import { formatInstant } from "@/lib/utils/instant";
import { PLAN_COLUMNS } from "@/lib/legal/plan/proposal";
import { groupActions, lineOf } from "@/lib/legal/plan/groups";
import type { LegalPlan, PlanRow } from "@/lib/legal/plan/queries";
import { groupAction } from "@/lib/legal/plan/where";
import { formatDate } from "@/lib/release/format";

const fr = { legal };

/** Juridique's fourth step: the plan to launch, or the plan launched. */
export function PlanView({
  projectId,
  plan,
}: {
  projectId: string;
  plan: LegalPlan;
}) {
  const t = fr.legal.plan;
  if (plan.state === "needs_confirmation")
    return (
      <div className="grid gap-8">
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
        <PlanForm
          projectId={projectId}
          items={plan.items}
          people={plan.people}
        />
      </div>
    );

  return (
    <div className="grid gap-8">
      <ToneCallout tone="success">
        {t.launched(formatInstant(plan.launchedAt), plan.launchedBy)}{" "}
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
            projectId={projectId}
            items={plan.items.filter((item) => item.column === column)}
            labelOf={new Map(plan.items.map((i) => [i.key, i.label]))}
          />
        </PageSection>
      ))}
    </div>
  );
}

function LaunchedRows({
  projectId,
  items,
  labelOf,
}: {
  projectId: string;
  items: PlanRow[];
  labelOf: Map<string, string>;
}) {
  const t = fr.legal.plan;
  if (items.length === 0) return <EmptyNote>{t.empty}</EmptyNote>;
  return (
    <div className="flex flex-col gap-6">
      {groupActions(items, labelOf).map((group) => (
        <ActionGroup
          key={group.kind}
          title={group.title}
          count={group.items.length}
          why={group.why}
          after={group.after}
          action={groupAction(projectId, group.items)}
        >
          {group.items.map((item) => {
            const line = lineOf(item, group, labelOf);
            return (
              <li
                key={item.key}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium break-words">{line.title}</span>
                  {line.detail && (
                    <span className="text-sm break-words text-muted-foreground">
                      {line.detail}
                    </span>
                  )}
                  {line.why && (
                    <span className="text-sm break-words text-muted-foreground">
                      {line.why}
                    </span>
                  )}
                  {line.after.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {t.after(line.after.join(", "))}
                    </span>
                  )}
                </div>
                <span className="text-sm text-muted-foreground sm:text-right">
                  {item.responsibleName ?? t.noResponsible}
                  {item.dueOn && ` · ${formatDate(item.dueOn)}`}
                </span>
              </li>
            );
          })}
        </ActionGroup>
      ))}
    </div>
  );
}
