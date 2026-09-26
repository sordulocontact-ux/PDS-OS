import { IconFolderOpen } from "nucleo-sharp-essential";
import { notFound } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { ProjectsTable } from "@/components/projects/projects-table";
import { EmptyState } from "@/components/shell/empty-state";
import { requireApproved } from "@/lib/auth/dal";
import { getArtist } from "@/lib/catalog/artist-queries";
import { fr } from "@/lib/i18n/fr";
import { listProjects } from "@/lib/projects/queries";

// Projects tab: live projects holding one of the artist's masters, among
// those the viewer may see (RLS), in the same table as the Projects page.
export default async function ArtistProjectsPage({
  params,
}: PageProps<"/app/catalog/artists/[artistId]/projects">) {
  await requireApproved();
  const { artistId } = await params;
  const artist = await getArtist(artistId);
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
  return <ProjectsTable projects={projects} />;
}
