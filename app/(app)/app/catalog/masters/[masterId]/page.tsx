import { IconPlus } from "nucleo-sharp-essential";
import { IconArrowLeft } from "@/components/icons";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { buttonVariants } from "@/components/ui/button";
import { FactList, type Fact } from "@/components/ui/fact-list";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { getMaster } from "@/lib/catalog/queries";
import { formatDuration, formatIsrc } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";
import { isProjectType } from "@/lib/projects/types";

export default async function MasterPage({
  params,
}: PageProps<"/app/catalog/masters/[masterId]">) {
  const access = await requireApproved();
  const { masterId } = await params;
  const master = await getMaster(masterId);
  if (!master) notFound();

  const t = fr.catalog.master;
  const notProvided = fr.catalog.notProvided;
  const facts: Fact[] = [
    { label: t.version, value: master.version ?? t.mainVersion },
    {
      label: t.isrc,
      value: master.isrc ? formatIsrc(master.isrc) : null,
      valueClassName: "font-mono",
    },
    {
      label: t.duration,
      value: master.durationSeconds
        ? formatDuration(master.durationSeconds)
        : null,
      valueClassName: "tabular-nums",
    },
  ];
  const createProject = can(access, "create_projects") ? (
    <Link
      href={routes.projectsNewFromMaster(master.id)}
      className={buttonVariants({ size: "lg" })}
    >
      <IconPlus aria-hidden data-icon="inline-start" />
      {t.createProject}
    </Link>
  ) : null;

  return (
    <PageContainer className="max-w-6xl">
      <Link
        href={routes.masters}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <IconArrowLeft className="size-4" aria-hidden />
        {t.back}
      </Link>
      <PageHeader
        title={master.title}
        description={master.artists}
        action={createProject}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex min-w-0 flex-col gap-8">
          <section
            aria-labelledby="credits-title"
            className="flex flex-col gap-3"
          >
            <h2 id="credits-title" className="text-base font-medium">
              {t.credits}
            </h2>
            <ol className="divide-y divide-border rounded-xl border border-border">
              {master.credits.map((credit, index) => (
                <li
                  key={credit.artistId}
                  className="relative flex items-center gap-3 px-4 py-3"
                >
                  <span className="w-4 text-sm text-muted-foreground tabular-nums">
                    {index + 1}
                  </span>
                  <Link
                    href={routes.artist(credit.artistId)}
                    className="min-w-0 flex-1 truncate text-sm font-medium no-underline after:absolute after:inset-0 hover:underline"
                  >
                    {credit.name}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {fr.catalog.artistPicker.roles[credit.role]}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section
            aria-labelledby="projects-title"
            className="flex flex-col gap-3"
          >
            <h2 id="projects-title" className="text-base font-medium">
              {t.linkedProjects}
            </h2>
            {master.projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t.noLinkedProjects}
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {master.projects.map((project) => (
                  <li key={project.id} className="relative px-4 py-3">
                    <Link
                      href={routes.project(project.id)}
                      className="text-sm font-medium no-underline after:absolute after:inset-0 hover:underline"
                    >
                      {project.title}
                    </Link>
                    {isProjectType(project.type) && (
                      <p className="text-xs text-muted-foreground">
                        {fr.shell.projectTypes[project.type]}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section aria-labelledby="facts-title" className="flex flex-col gap-3">
          <h2 id="facts-title" className="text-base font-medium">
            {t.facts}
          </h2>
          <FactList facts={facts} emptyLabel={notProvided} />
        </section>
      </div>
    </PageContainer>
  );
}
