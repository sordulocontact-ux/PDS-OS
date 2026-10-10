import { IconChevronLeft } from "nucleo-sharp-essential";
import { notFound, redirect } from "next/navigation";

import { ValidationPanel } from "@/components/framing/validation-panel";
import { EditAccessProvider } from "@/components/projects/edit-access";
import { BriefSectionsPlan } from "@/components/strategy/brief/brief-sections-plan";
import { BriefSectionsStory } from "@/components/strategy/brief/brief-sections-story";
import { BriefToDecide } from "@/components/strategy/brief/brief-to-decide";
import { StrategyDictation } from "@/components/strategy/strategy-dictation";
import { sectionCardClass } from "@/components/ui/section-card";
import { ViewLink } from "@/components/ui/view-link";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { loadBudget } from "@/lib/budget/queries";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";
import { workflowGate } from "@/lib/plan/queries";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { isFramingValidated } from "@/lib/projects/types";
import { arbitrations, briefReadiness } from "@/lib/strategy/brief";
import { strategyBudget } from "@/lib/strategy/budget";
import { dimensionStatuses } from "@/lib/strategy/dimensions";
import { loadStrategy } from "@/lib/strategy/queries";
import { allInOrder } from "@/lib/utils/parallel";
import { cn } from "@/lib/utils";

export const metadata = { title: `${fr.strategyBrief.title} · ${fr.app.name}` };

/**
 * The Brief de sortie consolidé (ticket Stratégie § 8): the eight
 * dimensions in one internal reference document, established by code from
 * what the strategy holds, with only what is still to arbitrate put
 * forward; « Modifier avec PO » (the strategy's dictation) and « Demander
 * la validation » (the stage's circuit, the director decides).
 */
export default async function StrategyBriefPage({
  params,
}: PageProps<"/app/projects/[projectId]/strategy/brief">) {
  const { projectId } = await params;
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  // Before the strategy is open, its page says why (Cadrage, plan, entry).
  if (!isFramingValidated(project.stages))
    redirect(routes.projectStrategy(projectId));
  if (await workflowGate(project, "strategy"))
    redirect(routes.projectStrategy(projectId));
  const [data, budgetData] = await Promise.all([
    loadStrategy(projectId, access),
    loadBudget(projectId),
  ]);
  if (!data) notFound();
  if (!data.started) redirect(routes.projectStrategy(projectId));

  const t = fr.strategyBrief;
  const today = todayInParis();
  const state = data.stage?.state ?? "not_started";
  const canWrite = canEditProject(access, project) && state === "in_progress";
  const statuses = dimensionStatuses({
    ...data,
    today,
    budgetLines: budgetData.lines,
    envelopeCents: project.budgetCents,
  });
  const { ready, missing } = briefReadiness(statuses);
  const budget = strategyBudget(
    budgetData.lines,
    data.levers,
    project.budgetCents,
  );
  const toDecide = arbitrations({ ...data, budget, today });
  const flagged = new Set(toDecide.map((item) => item.dimension));

  return (
    <div className="grid gap-10 pt-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <EditAccessProvider canEdit={canWrite}>
        <div className="flex min-w-0 flex-col gap-8">
          <ViewLink
            href={routes.projectStrategy(projectId)}
            className="-ml-1 inline-flex min-h-10 w-fit items-center gap-1 rounded-md px-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <IconChevronLeft aria-hidden className="size-4" />
            {t.backToPilotage}
          </ViewLink>
          <StrategyDictation projectId={projectId} label={t.modifyWithPo}>
            <h2 className="text-display-md font-semibold break-words">
              {t.title}
            </h2>
            <p className="text-caption text-muted-foreground">
              {t.asOf(formatBriefDate(today))}
            </p>
            <p className="max-w-prose text-body-md text-muted-foreground">
              {t.body}
            </p>
          </StrategyDictation>

          {!ready ? (
            <section className={cn(sectionCardClass, "flex flex-col gap-2")}>
              <h2 className="text-body-md font-semibold">{t.notReady.title}</h2>
              <p className="text-body-md text-muted-foreground">
                {t.notReady.body}
              </p>
              <ul className="flex list-disc flex-col gap-1 pl-5">
                {missing.map((d) => (
                  <li key={d}>
                    <ViewLink
                      href={routes.projectStrategyDimension(projectId, d)}
                      className="underline underline-offset-2"
                    >
                      {fr.strategyPilot.dimensions[d]}
                    </ViewLink>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <>
              <BriefToDecide projectId={projectId} items={toDecide} />
              <article
                aria-label={t.title}
                className={cn(sectionCardClass, "flex flex-col gap-8")}
              >
                <BriefSectionsStory data={data} flagged={flagged} />
                <BriefSectionsPlan
                  data={data}
                  budget={budget}
                  flagged={flagged}
                />
              </article>
            </>
          )}
        </div>
      </EditAccessProvider>

      <aside className="self-start rounded-2xl border border-border bg-background p-5 lg:sticky lg:top-6">
        <ValidationPanel
          stage={data.stage}
          pendingValidation={data.pendingValidation}
          projectId={projectId}
          mePersonId={access.personId}
          title={t.validationTitle}
          startLabel={fr.strategy.validation.start}
          requestBlocked={ready ? null : t.requestBlocked}
        />
      </aside>
    </div>
  );
}
