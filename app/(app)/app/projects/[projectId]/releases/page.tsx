import { notFound } from "next/navigation";

import { ProjectHeader } from "@/components/projects/project-header";
import {
  ReleaseModeButton,
  ReleasesView,
} from "@/components/projects/releases/releases-view";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { loadCollectiveReleases } from "@/lib/release/collective-releases";
import { formatShortDate } from "@/lib/release/format";
import type { ModuleFact } from "@/lib/ui/module-frame";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: fr.collectiveReleases.title };

/**
 * « Sorties » of a launched collective (lot 13 of docs/pds-mic-plan.md,
 * décision 7): its mode (« Modifier » for who writes its titles) and its
 * releases — one per title, the compilation, or both — each with its own
 * date, UPC, ISRC and state. Never shown for another project (404, no entry
 * in its navigation): a simple project's release stays in its Distribution.
 */
export default async function ProjectReleasesPage({
  params,
}: PageProps<"/app/projects/[projectId]/releases">) {
  const { projectId } = await params;
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  if (!project.collective) notFound();
  const data = await loadCollectiveReleases(project, access);
  const t = fr.collectiveReleases;
  const live = data.releases.filter((r) => !r.abandoned);
  const compilation = live.find((r) => r.kind === "compilation");
  const facts: ModuleFact[] = [
    { key: "mode", label: t.facts.mode, value: t.modes[data.mode] },
    {
      key: "singles",
      label: t.facts.singles,
      value: String(live.filter((r) => r.kind === "title").length),
    },
    {
      key: "compilation",
      label: t.facts.compilation,
      value: compilation
        ? compilation.date
          ? formatShortDate(compilation.date)
          : t.noDate
        : t.facts.noCompilation,
    },
  ];
  return (
    <div className="flex flex-col gap-6">
      <ProjectHeader
        projectId={projectId}
        title={t.title}
        subtitle={t.description}
        facts={facts}
        actions={
          data.canEdit ? (
            <ReleaseModeButton projectId={projectId} mode={data.mode} />
          ) : undefined
        }
      />
      <ReleasesView projectId={projectId} data={data} />
    </div>
  );
}
