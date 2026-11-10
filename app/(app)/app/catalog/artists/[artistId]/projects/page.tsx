import { IconFolderOpen } from "nucleo-sharp-essential";
import { notFound } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { ProjectsTable } from "@/components/projects/projects-table";
import { EmptyState } from "@/components/shell/empty-state";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { getArtist } from "@/lib/catalog/artist-queries";
import { fr } from "@/lib/i18n/fr";
import { withActiveWorkflows } from "@/lib/overview/workflow-progress";
import { withCovers } from "@/lib/projects/covers";
import { listProjects } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: fr.catalog.artistPage.tabs.projects };

// Projects tab: live projects holding one of the artist's masters or naming
// it (content), among those the viewer may see (RLS), in the same table as
// the Projects page.
export default async function ArtistProjectsPage({
  params,
}: PageProps<"/app/catalog/artists/[artistId]/projects">) {
  const { artistId } = await params;
  const [access, artist] = await allInOrder([
    requireApproved(),
    getArtist(artistId),
  ]);
  if (!artist) notFound();
  const { projects, error } = await listProjects({ ids: artist.projectIds });
  const p = fr.catalog.artistPage;

  if (error) return <FormMessage kind="error">{p.loadError}</FormMessage>;
  if (projects.length === 0) {
    return (
      <EmptyState
        icon={IconFolderOpen}
        title={p.tabs.projects}
        body={p.noProjects}
      />
    );
  }
  return (
    <ProjectsTable
      withStep={false}
      projects={await withCovers(await withActiveWorkflows(projects))}
      rights={{
        canEdit: can(access, "create_projects"),
        canArchive: can(access, "archive_records"),
        archived: false,
      }}
    />
  );
}
