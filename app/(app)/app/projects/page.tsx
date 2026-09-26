import { IconFolderOpen, IconPlus } from "nucleo-sharp-essential";
import Link from "next/link";

import { FormMessage } from "@/components/auth/form-message";
import { ProjectsTable } from "@/components/projects/projects-table";
import { EmptyState } from "@/components/shell/empty-state";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { buttonVariants } from "@/components/ui/button";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { listProjects } from "@/lib/projects/queries";

export default async function ProjectsPage() {
  const access = await requireApproved();
  const t = fr.shell.projects;
  const { projects, error } = await listProjects();
  const canCreate = can(access, "create_projects");

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
      ) : projects.length === 0 ? (
        <EmptyState
          icon={IconFolderOpen}
          title={t.emptyTitle}
          body={canCreate ? t.emptyBody : t.emptyBodyReadOnly}
          action={newProject}
        />
      ) : (
        <ProjectsTable projects={projects} />
      )}
    </PageContainer>
  );
}
