import { notFound } from "next/navigation";

import { CallFacts } from "@/components/calls/call-facts";
import { StrategyStepFrame } from "@/components/strategy/journey/strategy-step-frame";
import { StrategyExchange } from "@/components/strategy/start/strategy-exchange";
import { StrategyStartWays } from "@/components/strategy/start/strategy-start-ways";
import { fr } from "@/lib/i18n/fr";
import { projectFormatLabel, projectKindLabel } from "@/lib/projects/labels";
import { strategySheetData } from "@/lib/strategy/call-sheet-data";
import { knownAtStart } from "@/lib/strategy/start-reco";
import { strategyStepData } from "@/lib/strategy/step-data";
import { formatDay, formatShortInstant } from "@/lib/utils/day";

/**
 * Stratégie › Démarrer la stratégie (proto stratEntry, ticket § 1): the
 * project, its release and the status, then the two ways in; once chosen,
 * « Départ » — started directly, or the strategy exchange from its
 * preparation to its summary to the participants.
 */
export default async function StrategyStartPage({
  params,
}: PageProps<"/app/projects/[projectId]/strategy/start">) {
  const { projectId } = await params;
  const ctx = await strategyStepData(projectId);
  if (!ctx) notFound();
  const { project, data, call, model, isOwner, access, steps } = ctx;
  const t = fr.strategyJourney.start;
  const step = steps[0];
  const names = fr.strategyJourney.names(ctx.validators.map((v) => v.name));

  let body: React.ReactNode;
  if (call)
    body = (
      <StrategyExchange
        projectId={projectId}
        call={call}
        model={model}
        canEdit={isOwner}
        ownerName={project.ownerName}
        validatorNames={names}
        mePersonId={access.personId}
      />
    );
  else if (step.status === "done") {
    const started = ctx.sources.workspace;
    body = (
      <CallFacts
        facts={[
          {
            label: t.departure,
            value: t.departureDirect(
              started?.startedBy ?? project.ownerName,
              started ? formatShortInstant(started.startedAt) : "—",
            ),
          },
        ]}
      />
    );
  } else {
    const kind = {
      type: project.type,
      musicFormat: project.musicFormat,
      contentFormatName: project.contentFormat?.name ?? null,
    };
    const known = knownAtStart({
      openNeeds: data.openNeeds.length,
      referenceDate: data.referenceDate,
      envelopeCents: project.budgetCents,
      framingObjective: data.framingObjective.text,
    });
    const missing = 8 - known;
    const recommended = missing > known ? "call" : "po";
    body = (
      <>
        <CallFacts
          facts={[
            {
              label: t.project,
              value: t.projectValue(
                project.title,
                projectFormatLabel(kind) ?? projectKindLabel(kind),
                project.artistName || null,
              ),
            },
            {
              label: t.release,
              value: data.referenceDate
                ? formatDay(data.referenceDate)
                : t.noRelease,
            },
            { label: t.status, value: t.notStarted },
          ]}
        />
        {isOwner && step.status === "current" ? (
          <StrategyStartWays
            projectId={projectId}
            recommended={recommended}
            reason={
              recommended === "call"
                ? t.reason(known, missing)
                : t.reasonPo(known)
            }
            callDefaults={await strategySheetData(
              project,
              data,
              ctx.budget.lines,
            )}
          />
        ) : (
          step.status === "current" && (
            <p className="text-caption text-[color:var(--text-tertiary)]">
              {t.waiting(project.ownerName ?? "—")}
            </p>
          )
        )}
      </>
    );
  }

  return (
    <StrategyStepFrame projectId={projectId} stepKey="start">
      <div className="flex flex-col gap-5">{body}</div>
    </StrategyStepFrame>
  );
}
