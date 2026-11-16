import { MasterStepFrame } from "@/components/master-workflow/master-step-frame";
import {
  pickSourceTitle,
  SourceLead,
  sourceGestureFirst,
} from "@/components/master-workflow/source/source-lead";
import { SourceStep } from "@/components/master-workflow/source/source-step";
import {
  FileRequestNotice,
  MyFileRequests,
  type FileRequestLine,
} from "@/components/master-workflow/file-requests/file-request-lines";
import type { MasterTitleChoice } from "@/lib/master-workflow/title-scope";
import { masterStepHref } from "@/lib/ui/master-steps";
import { masterJourneyContext } from "@/lib/master-workflow/journey-context";
import { loadSourceStep } from "@/lib/master-workflow/source-step";
import { loadMasterTitleScope } from "@/lib/master-workflow/title-scope";

// Master, Source: the version each title's mix starts from, confirmed by
// the owner, its final vocals awaited or anticipated (ticket § 1 and § 2).
// The former État du master and « Où en est la préparation » end here.
export default async function ProjectMasterSourcePage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/master/source">) {
  const [{ projectId }, { titre }] = await Promise.all([params, searchParams]);
  const [{ project, access }, all] = await Promise.all([
    masterJourneyContext(projectId),
    loadSourceStep(projectId),
  ]);
  const asked = typeof titre === "string" ? titre : null;
  // A collective: one title at a time, chosen in the trail (lot 8); by
  // default the Source's own (the first to confirm). Any other project
  // keeps its pills.
  const scope = await loadMasterTitleScope(
    projectId,
    "source",
    asked ?? pickSourceTitle(all, null)?.id ?? null,
  );
  const titleId = scope?.active.masterId ?? asked;
  const view = scope
    ? { ...all, titles: all.titles.filter((x) => x.id === titleId) }
    : all;
  // The owner's gesture heads the step (Akili, 02/11/2026: « on ne sait pas
  // quoi faire en arrivant »), the checks below it.
  const title = pickSourceTitle(view, titleId);
  // « Demander des fichiers » (lot 9 bis): the lines asked of the viewer,
  // every title together, head the step; the active title's open line says
  // to whom it was asked.
  const lineOf = (choice: MasterTitleChoice): FileRequestLine | null =>
    choice.request
      ? {
          id: choice.request.id,
          title: choice.label,
          href: `${masterStepHref(projectId, "source")}?titre=${choice.masterId}`,
          personName: choice.request.name,
          requestedByName: choice.request.requestedByName,
          note: choice.request.note,
          createdAt: choice.request.createdAt,
        }
      : null;
  const mine = (scope?.choices ?? []).flatMap((choice) => {
    const line = lineOf(choice);
    return line && choice.request?.personId === access.personId ? [line] : [];
  });
  const activeLine = scope ? lineOf(scope.active) : null;
  const notice = activeLine && !mine.some((l) => l.id === activeLine.id) && (
    <FileRequestNotice
      projectId={projectId}
      line={activeLine}
      canCancel={
        scope?.active.request?.requestedBy === access.personId ||
        (project.ownerPersonId !== null &&
          project.ownerPersonId === access.personId)
      }
    />
  );
  const gesture = sourceGestureFirst(view, title);
  const lead =
    mine.length > 0 ? (
      <MyFileRequests projectId={projectId} lines={mine} />
    ) : gesture ? (
      <div className="flex flex-col gap-4">
        {notice}
        <SourceLead view={view} title={title} />
      </div>
    ) : null;
  return (
    <MasterStepFrame
      projectId={projectId}
      stepKey="source"
      titleScope={scope}
      slots={lead ? { lead } : undefined}
    >
      {!gesture && notice}
      <SourceStep view={view} titleId={titleId} ownerName={project.ownerName} />
    </MasterStepFrame>
  );
}
