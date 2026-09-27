import {
  IconBoxArchive,
  IconFolderOpen,
  IconPlus,
} from "nucleo-sharp-essential";
import Link from "next/link";

import { ArchiveViewToggle } from "@/components/archive/archive-view-toggle";
import { FormMessage } from "@/components/auth/form-message";
import { ProjectsTable } from "@/components/projects/projects-table";
import { EmptyState } from "@/components/shell/empty-state";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { buttonVariants } from "@/components/ui/button";
import { isArchivedView } from "@/lib/archive/types";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { listProjects } from "@/lib/projects/queries";

export default async function ProjectsPage({
  searchParams,
}: PageProps<"/app/projects">) {
  const access = await requireApproved();
  const t = fr.shell.projects;
  const canArchive = can(access, "archive_records");
  // The archive is the director's: anyone else always sees live projects.
  const archived = canArchive && isArchivedView((await searchParams).view);
  const { projects, error } = await listProjects({ archived });
  const canCreate = can(access, "create_projects") && !archived;

  const newProject = canCreate ? (
    <Link href={routes.projectsNew} className={buttonVariants({ size: "lg" })}>
      <IconPlus aria-hidden data-icon="inline-start" />
      {t.newProject}
    </Link>
  ) : null;

  return (
    <PageContainer>
      <PageHeader
        title={t.title}
        description={t.subtitle}
        action={projects.length > 0 ? newProject : null}
      />
      {canArchive && (
        <ArchiveViewToggle path={routes.projects} archived={archived} />
      )}

      {error ? (
        <FormMessage kind="error">{t.loadError}</FormMessage>
      ) : projects.length === 0 ? (
        archived ? (
          <EmptyState
            icon={IconBoxArchive}
            title={fr.records.archivedEmpty.project}
            body={fr.records.archivedEmptyBody}
          />
        ) : (
          <EmptyState
            icon={IconFolderOpen}
            title={t.emptyTitle}
            body={canCreate ? t.emptyBody : t.emptyBodyReadOnly}
            action={newProject}
          />
        )
      ) : (
        <ProjectsTable
          projects={projects}
          rights={{
            canEdit: can(access, "create_projects"),
            canArchive,
            archived,
          }}
        />
      )}
    </PageContainer>
  );
}
