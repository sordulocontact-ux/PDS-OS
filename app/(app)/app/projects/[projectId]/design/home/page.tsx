import { notFound } from "next/navigation";

import { CallFacts } from "@/components/calls/call-facts";
import { DesignStepFrame } from "@/components/design/design-step-frame";
import { CreativeBlock } from "@/components/design/home/creative-block";
import { DesignExchange } from "@/components/design/home/design-exchange";
import { ReceivedDeliverables } from "@/components/design/home/received-deliverables";
import { DesignStartWays } from "@/components/design/home/start-ways";
import { DesignWaits } from "@/components/design/waiting-row";
import { designSheetData } from "@/lib/design/call-sheet-data";
import { designJourneyContext } from "@/lib/design/journey-context";
import { fr } from "@/lib/i18n/fr";
import { projectKindLabel } from "@/lib/projects/labels";
import { formatDay, formatShortInstant } from "@/lib/utils/day";

const t = fr.designSteps.home;

/**
 * Conception › Accueil (proto de0, ticket § 1 to 3): the project, its
 * release and the Brief de sortie it starts from, the deliverables received
 * (one sheet each), the responsible créatif, then the way in — a creative
 * exchange prepared in the step, or « Commencer directement ».
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

  let way: React.ReactNode = null;
  if (start.path === "direct")
    way = (
      <CallFacts
        facts={[
          {
            label: t.start.departure,
            value: `${t.start.direct_} · ${t.start.directBy(ctx.nameOf(start.pathBy) || "—")}`,
          },
        ]}
      />
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
        reason={
          confirmed.length
            ? t.start.reasonKnown(confirmed.length)
            : t.start.reasonEmpty
        }
        callData={callData}
      />
    );
  else if (ctx.people.direction.responsible)
    way = <DesignWaits step={home} actors={[home.actor]} />;

  return (
    <DesignStepFrame projectId={projectId} stepKey="home">
      <CallFacts
        facts={[
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
        ]}
      />
      <ReceivedDeliverables ctx={ctx} />
      <CreativeBlock ctx={ctx} />
      {way}
    </DesignStepFrame>
  );
}
