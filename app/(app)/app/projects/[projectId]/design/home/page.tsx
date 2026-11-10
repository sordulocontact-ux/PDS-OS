import { notFound } from "next/navigation";

import { FactRow, FactRows } from "@/components/ui/fact-row";
import { DesignStepFrame } from "@/components/design/design-step-frame";
import { CreativeBlock } from "@/components/design/home/creative-block";
import { DesignExchange } from "@/components/design/home/design-exchange";
import { ReceivedDeliverables } from "@/components/design/home/received-deliverables";
import { DesignStartWays } from "@/components/design/home/start-ways";
import { StepWaiting } from "@/components/shell/journey/step-waiting";
import { designSheetData } from "@/lib/design/call-sheet-data";
import { designJourneyContext } from "@/lib/design/journey-context";
import { fr } from "@/lib/i18n/fr";
import { projectKindLabel } from "@/lib/projects/labels";
import { formatDay, formatShortDay, formatShortInstant } from "@/lib/utils/day";

const t = fr.designSteps.home;

/**
 * Conception › Accueil (proto de0, ticket § 1 to 3): the project, its
 * release and the Brief de sortie it starts from, the deliverables received
 * (one sheet each), the responsible créatif, then the way in — a creative
 * exchange prepared in the step, or « Commencer directement ». Started
 * directly, the two ways in stay offered until the direction is submitted.
 */
export default async function DesignHomePage({
  params,
}: PageProps<"/app/projects/[projectId]/design/home">) {
  const { projectId } = await params;
  const ctx = await designJourneyContext(projectId);
  if (!ctx) notFound();
  const { project, data, start } = ctx;
  const home = ctx.steps[0];
  const chosenCall = start.path === "call" && !ctx.call;
  const callData =
    chosenCall && ctx.isOwner ? await designSheetData(project, data) : null;
  const confirmed = data.intentions.filter((i) => i.status === "confirmed");

  const reason = confirmed.length
    ? t.start.reasonKnown(confirmed.length)
    : t.start.reasonEmpty;
  // Started directly, the way in can still change until the direction is
  // submitted (as the Cadrage and the Stratégie, Sacha 06/11/2026).
  const direction = ctx.steps.find((s) => s.key === "direction");
  const canChange =
    ctx.isOwner &&
    !ctx.call &&
    direction !== undefined &&
    direction.status !== "waiting" &&
    direction.status !== "done";

  let way: React.ReactNode = null;
  if (start.path === "direct" && canChange)
    way = (
      <DesignStartWays
        projectId={projectId}
        chosen={null}
        reason={null}
        callData={null}
        started
        startedOn={
          start.pathAt ? formatShortDay(start.pathAt, { bare: true }) : null
        }
      />
    );
  else if (start.path === "direct")
    way = (
      <FactRows>
        <FactRow
          label={t.start.departure}
          value={`${t.start.direct_} · ${t.start.directBy(ctx.nameOf(start.pathBy) || "—")}`}
        />
      </FactRows>
    );
  else if (ctx.call) way = <DesignExchange ctx={ctx} />;
  else if (ctx.isOwner && home.status !== "blocked")
    way = (
      <DesignStartWays
        projectId={projectId}
        chosen={
          chosenCall
            ? {
                by: ctx.nameOf(start.pathBy) || "—",
                at: start.pathAt ? formatShortInstant(start.pathAt) : "—",
              }
            : null
        }
        reason={reason}
        callData={callData}
      />
    );
  else if (ctx.people.direction.responsible) way = <StepWaiting step={home} />;

  return (
    <DesignStepFrame projectId={projectId} stepKey="home">
      <FactRows>
        {[
          {
            label: t.facts.project,
            value: [
              project.title,
              project.artistName,
              projectKindLabel({
                type: project.type,
                musicFormat: project.musicFormat,
                contentFormatName: project.contentFormat?.name ?? null,
              }),
            ]
              .filter(Boolean)
              .join(" · "),
          },
          ...(data.known.releaseDate
            ? [
                {
                  label: t.facts.release,
                  value: formatDay(data.known.releaseDate),
                },
              ]
            : []),
          {
            label: t.facts.strategy,
            value: start.strategy?.at
              ? t.strategyValue(
                  start.strategy.version,
                  formatShortInstant(start.strategy.at),
                )
              : t.strategyPending,
          },
        ].map((f) => (
          <FactRow key={f.label} label={f.label} value={f.value} />
        ))}
      </FactRows>
      <ReceivedDeliverables ctx={ctx} />
      <CreativeBlock ctx={ctx} />
      {way}
    </DesignStepFrame>
  );
}
