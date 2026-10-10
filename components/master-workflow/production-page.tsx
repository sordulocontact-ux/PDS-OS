import Link from "next/link";
import { IconCheck } from "nucleo-sharp-essential";

import { IconCircleCheck } from "@/components/icons";

import { MixVersionsSection } from "@/components/master-workflow/mix-versions-section";
import { PackageSections } from "@/components/master-workflow/package-sections";
import { EmptyState } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import type { MixVersionsView } from "@/lib/master-workflow/mix-types";
import type { StepView } from "@/lib/master-workflow/transmission";
import { masterStepHref } from "@/lib/ui/master-steps";

type Round = { view: StepView; versions: MixVersionsView };

/** Where a round stands, over its own titles: those it carries (no master
 * final yet) and those that already went through it (they have versions).
 * A title at its master final before the workflow is never counted. */
export function roundCount(versions: MixVersionsView, view: StepView) {
  const planned = new Set(view.titles.map((title) => title.id));
  const titles = versions.titles.filter(
    (title) => planned.has(title.masterId) || title.versions.length > 0,
  );
  return {
    finals: titles.filter((title) => title.finalNumber !== null).length,
    total: titles.length,
  };
}

/** Every title has its Mix final: the mastering's package holds them all
 * (the rule of the Mastering step). */
export const mixRoundDone = (mastering: StepView) =>
  mastering.titles.length > 0 &&
  mastering.titles.every((title) => title.source);

/**
 * One round of the master on its own step (ticket « Architecture globale »,
 * 08/10/2026: Mixage and Mastering are two chevrons; the validations stay
 * inside each, never a step of their own). Both rounds are alike: the
 * package sent to the engineer, then the versions received, decided title by
 * title. The mastering opens once every title has its Mix final; before, its
 * page says why (`waiting`). A finished round folds into one line.
 */
export function ProductionPage({
  stage,
  round,
  done,
  waiting,
}: {
  stage: "mix" | "mastering";
  round: Round;
  done: boolean;
  // Mastering not open yet: the Mix finals so far, out of the titles.
  waiting?: { finals: number; total: number } | null;
}) {
  const t = fr.masterWorkflow.production[stage];
  const engineer = round.view.engineer;
  const count = roundCount(round.versions, round.view);

  // Every title had its master final before the workflow: no round at all.
  if (count.total === 0 && round.view.finished > 0)
    return (
      <div className="grid gap-10">
        <EmptyState
          icon={IconCircleCheck}
          title={t.nothing}
          body={fr.masterWorkflow.production.alreadyFinal(round.view.finished)}
          action={
            <Link
              href={masterStepHref(round.view.projectId, "final")}
              className={buttonVariants({ variant: "outline" })}
            >
              {fr.masterWorkflow.production.toFinal}
            </Link>
          }
        />
      </div>
    );

  return (
    <div className="grid gap-10">
      <RoundSection
        id={stage}
        title={t.round}
        done={done}
        progress={
          waiting
            ? null
            : fr.masterWorkflow.production.progress(count.finals, count.total)
        }
        doneLine={t.done}
      >
        {waiting ? (
          <p className="text-sm text-muted-foreground">
            {fr.masterWorkflow.production.mastering.waiting(
              waiting.finals,
              waiting.total,
            )}
          </p>
        ) : (
          <>
            {stage === "mastering" && engineer && (
              <ToneCallout tone="success">
                {round.view.brief?.masteringSameEngineer
                  ? fr.masterWorkflow.mastering.sameEngineer(engineer.name)
                  : fr.masterWorkflow.mastering.otherEngineer(engineer.name)}
              </ToneCallout>
            )}
            <RoundBody round={round} stage={stage} />
          </>
        )}
      </RoundSection>
    </div>
  );
}

// A round: its title and progress; open while it runs, folded once done.
function RoundSection({
  id,
  title,
  done,
  progress,
  doneLine,
  children,
}: {
  id: string;
  title: string;
  done: boolean;
  progress: string | null;
  doneLine: string;
  children: React.ReactNode;
}) {
  const head = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <h2 className="text-lg font-semibold">{title}</h2>
      {done ? (
        <StatusBadge tone="success" size="sm">
          <IconCheck aria-hidden className="size-3" />
          {doneLine}
        </StatusBadge>
      ) : (
        progress && (
          <span className="text-sm text-muted-foreground tabular-nums">
            {progress}
          </span>
        )
      )}
    </div>
  );
  if (done)
    return (
      <section id={id} className="scroll-mt-4">
        <details className="group flex flex-col">
          <summary className="cursor-pointer list-none marker:hidden">
            {head}
            <span className="text-sm text-muted-foreground underline-offset-4 group-open:hidden hover:underline">
              {fr.masterWorkflow.production.show}
            </span>
          </summary>
          <div className="flex flex-col gap-8 pt-6">{children}</div>
        </details>
      </section>
    );
  return (
    <section id={id} className="flex scroll-mt-4 flex-col gap-6">
      {head}
      {children}
    </section>
  );
}

function RoundBody({
  round,
  stage,
}: {
  round: Round;
  stage: "mix" | "mastering";
}) {
  const s = fr.masterWorkflow.mixVersions.stages[stage];
  return (
    <>
      <PackageSections view={round.view} />
      <PageSection
        id={`${stage}-versions`}
        title={s.title}
        description={s.description}
        card
      >
        <MixVersionsSection
          projectId={round.view.projectId}
          view={round.versions}
          canEdit={round.view.canEdit}
          organizationId={round.view.organizationId}
          hasBrief={round.view.brief !== null}
        />
      </PageSection>
    </>
  );
}
