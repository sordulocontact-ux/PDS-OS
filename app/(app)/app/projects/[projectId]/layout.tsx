import { IconArrowLeft } from "@/components/icons";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EditAccessProvider } from "@/components/projects/edit-access";
import { ProjectTabs } from "@/components/projects/project-tabs";
import { ReadOnlyNotice } from "@/components/projects/read-only-notice";
import { StageBar } from "@/components/projects/stage-bar";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { canEditProject } from "@/lib/projects/edit-access";
import { getProject } from "@/lib/projects/queries";

// Project frame: header, stage bar, section tabs. Pages below still check
// access themselves (a layout does not re-run on client navigation); the
// project query is cached per request, so they reuse it for free.
export default async function ProjectLayout({
  children,
  params,
}: LayoutProps<"/app/projects/[projectId]">) {
  const access = await requireApproved();
  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project) notFound();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-6 md:px-8 md:pt-8">
      <Link
        href={routes.projects}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <IconArrowLeft className="size-4" aria-hidden />
        {fr.shell.project.back}
      </Link>

      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight break-words">
          {project.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {[project.artistName, fr.shell.projectTypes[project.type]]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      {/* Stages and sections exist once the project is launched, not before. */}
      {project.stages.length > 0 && (
        <>
          <StageBar stages={project.stages} current={project.currentStage} />
          <ProjectTabs projectId={project.id} />
        </>
      )}

      {/* Only the owner writes inside a launched project; the database enforces it. */}
      <EditAccessProvider canEdit={canEditProject(access, project)}>
        {project.stages.length > 0 && <ReadOnlyNotice />}
        <div className="flex flex-col pb-8">{children}</div>
      </EditAccessProvider>
    </div>
  );
}
