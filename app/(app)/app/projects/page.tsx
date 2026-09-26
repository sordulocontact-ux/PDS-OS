import { FolderPlusIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

import { FormMessage } from "@/components/auth/form-message";
import { ProjectsTable } from "@/components/projects/projects-table";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { buttonVariants } from "@/components/ui/button";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { listProjects } from "@/lib/projects/queries";

export default async function ProjectsPage() {
  await requireApproved();
  const t = fr.shell.projects;
  const { projects, error } = await listProjects();

  const newProject = (
    <Link href={routes.projectsNew} className={buttonVariants({ size: "lg" })}>
      <PlusIcon aria-hidden data-icon="inline-start" />
      {t.newProject}
    </Link>
  );

  return (
    <PageContainer>
      <PageHeader
        title={t.title}
        description={t.subtitle}
        action={projects.length > 0 ? newProject : undefined}
      />

      {error ? (
        <FormMessage kind="error">{t.loadError}</FormMessage>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-4 py-16 text-center">
          <FolderPlusIcon
            className="size-6 text-muted-foreground"
            aria-hidden
          />
          <h2 className="text-base font-medium">{t.emptyTitle}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {t.emptyBody}
          </p>
          <div className="mt-2">{newProject}</div>
        </div>
      ) : (
        <ProjectsTable projects={projects} />
      )}
    </PageContainer>
  );
}
