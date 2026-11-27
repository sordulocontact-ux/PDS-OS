import { notFound } from "next/navigation";

import { OverviewNow } from "@/components/overview/overview-now";
import { OverviewProgress } from "@/components/overview/overview-progress";
import { ProjectHeader } from "@/components/projects/project-header";
import { TitleHeading } from "@/components/projects/titles/title-heading";
import { TitleNameField } from "@/components/projects/titles/title-name-field";
import { TitlesRecapCompact } from "@/components/projects/titles/titles-recap-compact";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { ViewLink } from "@/components/ui/view-link";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { workflowsFinished } from "@/lib/overview/cards";
import { canEditProject } from "@/lib/projects/edit-access";
import { joinArtistNames } from "@/lib/projects/participation-rules";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { loadTitleRecap } from "@/lib/projects/recap";
import {
  loadTitleChoices,
  loadTitleProgress,
} from "@/lib/projects/title-journeys";
import { masterNameOf } from "@/lib/projects/title-rules";
import { projectTitleTone } from "@/lib/ui/state-tones";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: fr.titleTracks.title };

/**
 * A collective's title (Maël 25/11/2026: « une page titre », each title
 * with its journeys, « le même parcours que les autres projets non MIC »):
 * the page of a project's overview for this title alone — « Maintenant »
 * (the viewer's first action on it, else whom it waits for) and
 * « Progression » (its Master, Juridique and Distribution, the same cards
 * as a project's, each opening the workflow on this title) —, then its
 * artists (the recap's rows of this title, read only, edited in « Titres
 * et artistes »). The other titles one click away in the trail. A
 * collective's only (404 otherwise).
 */
export default async function ProjectTrackPage({
  params,
}: PageProps<"/app/projects/[projectId]/tracks/[titleId]">) {
  const { projectId, titleId } = await params;
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  if (!project.collective) notFound();
  const [progress, choices, recap] = await Promise.all([
    loadTitleProgress(project.id, titleId),
    loadTitleChoices(project.id),
    loadTitleRecap(project, access, { planCalls: false }),
  ]);
  if (!progress) notFound();

  const t = fr.titleTracks;
  const { title } = progress;
  // An unnamed title's label already names its guests.
  const masterName = masterNameOf(title.master);
  const named = title.workingTitle ?? masterName;
  // Only the project's owner writes (is_project_owner): names it in place,
  // and « Nommer le titre » leads its « Maintenant » while it has no name
  // (Sacha, 27/11/2026).
  const canEdit = canEditProject(access, project);
  const naming = fr.projectTitles.naming;
  const mine = recap.titles.filter((row) => row.id === title.id);
  const masterOpen = progress.cards.some(
    (card) => card.workflow === "master" && !card.restricted,
  );

  return (
    <div className="flex flex-col gap-6">
      <ProjectHeader
        projectId={projectId}
        title={progress.label}
        heading={
          <TitleHeading
            projectId={projectId}
            titleId={title.id}
            label={progress.label}
            workingTitle={title.workingTitle}
            masterName={masterName}
            canEdit={canEdit && !progress.abandoned}
          />
        }
        subtitle={
          named && progress.guests.length > 0
            ? joinArtistNames(progress.guests)
            : undefined
        }
        status={{
          label: fr.projectTitles.statuses[title.status],
          tone: projectTitleTone[title.status],
        }}
        extraCrumbs={[
          {
            label: progress.label,
            href: routes.projectTrack(projectId, title.id),
            options:
              choices.length > 1
                ? choices.map((choice) => ({
                    key: choice.id,
                    label: choice.label,
                    detail:
                      choice.status === "abandoned"
                        ? fr.projectTitles.statuses.abandoned
                        : undefined,
                    href: routes.projectTrack(projectId, choice.id),
                    current: choice.id === title.id,
                  }))
                : undefined,
          },
        ]}
      />
      {progress.abandoned ? (
        <EmptyNote>{t.page.abandoned}</EmptyNote>
      ) : (
        // The overview's two zones (proto « Vue d'ensemble » validated
        // 10/11/2026), for this title.
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <OverviewNow
            mine={progress.journeys.mine}
            waiting={progress.journeys.waiting}
            finished={workflowsFinished(progress.cards)}
            lead={
              canEdit && !named
                ? {
                    todo: naming.todo,
                    gesture: (
                      <TitleNameField
                        projectId={projectId}
                        titleId={title.id}
                        required
                        submitLabel={naming.submit}
                        done={naming.named}
                      />
                    ),
                  }
                : null
            }
          />
          <OverviewProgress workflows={progress.cards} />
        </div>
      )}
      <PageSection
        id="artists"
        title={t.page.artists}
        action={
          <ViewLink
            href={routes.projectTitles(projectId)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ButtonRoll>{t.page.seeAll}</ButtonRoll>
          </ViewLink>
        }
      >
        <TitlesRecapCompact
          projectId={projectId}
          recap={{ ...recap, titles: mine }}
          href={routes.projectTitles(projectId)}
          masterHref={masterOpen ? routes.projectMaster(projectId) : null}
          oneTitle
        />
      </PageSection>
    </div>
  );
}
