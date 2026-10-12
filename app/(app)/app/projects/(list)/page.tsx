import {
  IconBoxArchive,
  IconFolderOpen,
  IconPlus,
} from "nucleo-sharp-essential";
import Link from "next/link";
import { Suspense } from "react";

import { archiveViews } from "@/components/archive/archive-views";
import { FormMessage } from "@/components/auth/form-message";
import { ProjectsBrowser } from "@/components/projects/projects-browser";
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
import { viewHref } from "@/lib/ui/view-href";
import { listProjectDrafts } from "@/lib/projects/drafts";
import { listProjects } from "@/lib/projects/queries";

export default async function ProjectsPage({
  searchParams,
}: PageProps<"/app/projects">) {
  const access = await requireApproved();
  const t = fr.shell.projects;
  const canArchive = can(access, "archive_records");
  // The archive is the director's: anyone else always sees live projects.
  const archived = canArchive && isArchivedView((await searchParams).view);
  const canCreate = can(access, "create_projects") && !archived;
  const [{ projects, error }, counts, drafts] = await Promise.all([
    listProjects({ archived }),
    canArchive ? countRecords("project") : null,
    // Drafts belong with the live projects of whoever may create them.
    canCreate ? listProjectDrafts() : [],
  ]);
  const listed = projects.length + drafts.length > 0;

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
        action={listed ? newProject : null}
      />
      {error ? (
        <FormMessage kind="error">{t.loadError}</FormMessage>
      ) : !listed && !archived && !counts?.archived ? (
        <EmptyState
          icon={IconFolderOpen}
          title={t.emptyTitle}
          body={canCreate ? t.emptyBody : t.emptyBodyReadOnly}
          action={newProject}
        />
      ) : !listed && archived ? (
        <DataTableViews
          label={fr.records.view.label}
          views={archiveViews({ path: routes.projects, archived, counts })}
        >
          <EmptyState
            icon={IconBoxArchive}
            title={fr.records.archivedEmpty.project}
            body={fr.records.archivedEmptyBody}
          />
        </DataTableViews>
      ) : (
        // Search, combined filters and tabs with exact counts (PROJ-UX-01).
        <Suspense fallback={null}>
          <ProjectsBrowser
            projects={projects}
            drafts={drafts}
            archived={archived}
            archivedCount={counts ? counts.archived : null}
            archivedHref={viewHref(routes.projects, { view: "archived" })}
            liveHref={routes.projects}
            rights={{
              canEdit: can(access, "create_projects"),
              canArchive,
              archived,
            }}
          />
        </Suspense>
      )}
    </PageContainer>
  );
}
