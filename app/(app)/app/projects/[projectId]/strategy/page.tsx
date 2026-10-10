import Link from "next/link";

import { DimensionNav } from "@/components/framing/intel/dimension-nav";
import { FramingCallSheet } from "@/components/framing/intel/framing-call-sheet";
import { ImportPanel } from "@/components/framing/import-panel";
import { EditAccessProvider } from "@/components/projects/edit-access";
import { DimensionList } from "@/components/strategy/dimension-list";
import { DimensionPanel } from "@/components/strategy/dimension-panel";
import { ProposeChoices } from "@/components/strategy/propose-choices";
import { StrategyDictation } from "@/components/strategy/strategy-dictation";
import { StrategyEntry } from "@/components/strategy/strategy-entry";
import { StrategyTabs } from "@/components/strategy/strategy-tabs";
import { buttonVariants } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";
import { prepareStrategyCall } from "@/lib/strategy/actions/call";
import { importStrategyReport } from "@/lib/strategy/actions/import";
import { isStrategyDimension } from "@/lib/strategy/dimensions";
import {
  loadStrategyPage,
  readyDeliverableIds,
  strategyCallSheet,
} from "@/lib/strategy/page-data";
import { projectKindLabel } from "@/lib/strategy/project";
import { upstreamChains } from "@/lib/strategy/upstream";
import { strategyDimensionTone } from "@/lib/ui/state-tones";

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/**
 * The Strategy (docs/ARCHITECTURE.md § 6 bis): a plain entry at first, then
 * the pilot of the eight dimensions; a dimension opens in the work panel
 * (?d=<dimension>). The Brief de sortie, the documents and the follow-up
 * have their own pages.
 */
export default async function StrategyPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/strategy">) {
  const { projectId } = await params;
  const sp = await searchParams;
  const page = await loadStrategyPage(projectId);
  const { project, data, ctx, assessment, stage, canEdit, canWrite } = page;
  const t = fr.strategyFlow;
  const callSheet = canEdit ? await strategyCallSheet(page) : null;

  if (!page.started)
    return (
      <StrategyEntry
        projectId={projectId}
        title={project.title}
        artist={project.artistName}
        kind={projectKindLabel(project)}
        releaseDate={data.referenceDate}
        status={
          t.entry.statuses[stage as keyof typeof t.entry.statuses] ?? stage
        }
        canEdit={canEdit && stage === "in_progress"}
        callSheet={
          callSheet ?? {
            topics: [],
            purpose: "",
            people: [],
            documents: [],
            defaultOccurredAt: "",
          }
        }
      />
    );

  const asked = first(sp.d);
  const open = isStrategyDimension(asked)
    ? assessment.dimensions.find((d) => d.dimension === asked)!
    : null;
  const done = assessment.counts.done;
  const notice = !canWrite
    ? canEdit && stage !== "in_progress" && !ctx.revisionOpen
      ? t.pilot.locked
      : null
    : ctx.revisionOpen
      ? t.pilot.revision
      : null;

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-body-md font-medium tabular-nums">
        {t.pilot.progress(done, assessment.dimensions.length)}
      </p>
      {canWrite && callSheet && (
        <FramingCallSheet
          projectId={projectId}
          data={callSheet}
          action={prepareStrategyCall}
          copy={t.call}
        />
      )}
    </div>
  );

  let content: React.ReactNode;
  if (open) {
    const chains =
      open.dimension === "calendar"
        ? upstreamChains(
            data.deliverables,
            data.milestones,
            todayInParis(),
            await readyDeliverableIds(projectId),
          )
        : [];
    content = (
      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <DimensionNav
          label={t.pilot.label}
          current={open.dimension}
          items={assessment.dimensions.map((d, index) => ({
            key: d.dimension,
            href: routes.projectStrategyDimension(projectId, d.dimension),
            title: `${t.dimensionNumber(index)} ${t.dimensions[d.dimension]}`,
            line: t.states[d.state],
            tone: strategyDimensionTone[d.state],
            statusLabel: t.states[d.state],
            done: d.state === "done",
          }))}
        />
        <DimensionPanel
          assessment={open}
          data={data}
          chains={chains}
          projectId={projectId}
        />
      </div>
    );
  } else {
    content = (
      <div className="flex flex-col gap-6">
        <DimensionList projectId={projectId} assessment={assessment} />
        <ToneCallout tone={assessment.ready ? "success" : "neutral"}>
          {assessment.ready ? t.pilot.briefReady : t.pilot.briefNotReady}
        </ToneCallout>
        <div>
          <Link
            href={routes.projectStrategyBrief(projectId)}
            className={buttonVariants({
              size: "lg",
              variant: assessment.ready ? "default" : "outline",
            })}
          >
            {t.pilot.toBrief}
          </Link>
        </div>
        {canWrite && (
          <div className="rounded-2xl border border-border bg-background p-5">
            <ImportPanel
              reports={data.reports}
              projectId={projectId}
              importAction={importStrategyReport}
              title={fr.strategy.import.title}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pt-6">
      <StrategyTabs projectId={projectId} />
      {notice && <ToneCallout tone="neutral">{notice}</ToneCallout>}
      <EditAccessProvider canEdit={canWrite}>
        {canWrite ? (
          <StrategyDictation
            projectId={projectId}
            actions={<ProposeChoices projectId={projectId} />}
          >
            {toolbar}
          </StrategyDictation>
        ) : (
          toolbar
        )}
        {content}
      </EditAccessProvider>
    </div>
  );
}
