import {
  IconBoxArchive,
  IconFolderOpen,
  IconPlus,
} from "nucleo-sharp-essential";
import Link from "next/link";

import { archiveViews } from "@/components/archive/archive-views";
import { FormMessage } from "@/components/auth/form-message";
import { ProjectsTable } from "@/components/projects/projects-table";
import { EmptyState } from "@/components/shell/empty-state";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { buttonVariants } from "@/components/ui/button";
import { DataTableViews } from "@/components/ui/data-table";
import { countRecords } from "@/lib/archive/queries";
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
  const [{ projects, error }, counts] = await Promise.all([
    listProjects({ archived }),
    canArchive ? countRecords("project") : null,
  ]);
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
      {error ? (
        <FormMessage kind="error">{t.loadError}</FormMessage>
      ) : (
        <DataTableViews
          label={fr.records.view.label}
          views={archiveViews({ path: routes.projects, archived, counts })}
        >
          {projects.length === 0 ? (
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
        </DataTableViews>
      )}
    </PageContainer>
  );
}
