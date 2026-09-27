import { notFound } from "next/navigation";

import { FramingDictation } from "@/components/framing/framing-dictation";
import { FramingStart } from "@/components/framing/framing-start";
import { FrameStep } from "@/components/framing/guide/frame-step";
import { NeedsStep } from "@/components/framing/guide/needs-step";
import { ObjectiveStep } from "@/components/framing/guide/objective-step";
import { OverviewStep } from "@/components/framing/guide/overview-step";
import { FramingStepNav } from "@/components/framing/guide/step-nav";
import { SummaryStep } from "@/components/framing/guide/summary-step";
import { TeamStep } from "@/components/framing/guide/team-step";
import { TimingStep } from "@/components/framing/guide/timing-step";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  FRAMING_VIEWS,
  framingOverview,
  nextView,
  parseView,
  type FramingView,
} from "@/lib/framing/guide";
import { isFramingOpen, loadFraming } from "@/lib/framing/queries";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

// Framing stages that still take changes: submitted or validated is frozen.
const EDITABLE_STATES = ["not_started", "in_progress"];

/**
 * Framing stage as a guided review (docs/ARCHITECTURE.md § 6): the 5 points
 * pre-filled from calls, answered one screen at a time by clicking, then a
 * recap and the shareable Brief. The screen is in the URL (?step=), so the
 * back button and a shared link land on the same question.
 * Locked until the project has a call report or "Commencer en amont".
 */
export default async function FramingPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/framing">) {
  const { projectId } = await params;
  const view = parseView((await searchParams).step);
  const [access, project, framingOpen] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
    isFramingOpen(projectId),
  ]);
  const canEdit = canEditProject(access, project);
  if (!framingOpen) {
    return <FramingStart projectId={projectId} canEdit={canEdit} />;
  }
  const data = await loadFraming(projectId, access);
  if (!data) notFound();

  const editable =
    canEdit && EDITABLE_STATES.includes(data.stage?.state ?? "not_started");
  const hrefOf = (v: FramingView) =>
    v === "overview"
      ? routes.projectFraming(projectId)
      : routes.projectFramingStep(projectId, v);
  const nextHref = hrefOf(nextView(view) ?? "summary");
  const steps = framingOverview(data);
  const field = (key: "objective" | "timing") =>
    data.fields.find((f) => f.key === key)!;
  const common = { projectId, editable, nextHref };

  const screen = {
    overview: (
      <OverviewStep
        steps={steps}
        fromCall={data.reports.length > 0}
        hrefOf={hrefOf}
      />
    ),
    objective: (
      <ObjectiveStep
        key={`${field("objective").value}-${field("objective").status}`}
        field={field("objective")}
        suggestions={data.objectiveSuggestions}
        {...common}
      />
    ),
    timing: (
      <TimingStep
        key={`${field("timing").value}-${field("timing").status}`}
        field={field("timing")}
        {...common}
      />
    ),
    needs: (
      <NeedsStep
        // The selection on screen restarts from what is saved.
        key={data.needs.map((n) => `${n.id}:${n.review_status}`).join()}
        needs={data.needs}
        {...common}
      />
    ),
    frame: <FrameStep constraints={data.constraints} {...common} />,
    team: <TeamStep team={data.team} needs={data.needs} {...common} />,
    summary: (
      <SummaryStep
        data={data}
        projectId={projectId}
        mePersonId={access.personId}
        canEdit={canEdit}
        hrefOf={hrefOf}
        briefHref={routes.projectFramingBrief(projectId)}
      />
    ),
  }[view];

  return (
    <div className="flex flex-col gap-5">
      {editable && <FramingDictation projectId={projectId} />}
      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <FramingStepNav
          steps={steps}
          current={view}
          hrefs={
            Object.fromEntries(
              FRAMING_VIEWS.map((v) => [v, hrefOf(v)]),
            ) as Record<FramingView, string>
          }
        />
        {screen}
      </div>
    </div>
  );
}
