"use server";

import type { ProjectFormDefaults } from "@/components/projects/create-project-form";
import { centsToEuros } from "@/lib/assistant/drafts";
import { requireApproved } from "@/lib/auth/dal";
import { listArtistOptions, listMasterOptions } from "@/lib/catalog/queries";
import type { ArtistOption, MasterOption } from "@/lib/catalog/types";
import { listContentFormats } from "@/lib/projects/content-formats";
import { getProject } from "@/lib/projects/queries";
import { contentModeOf, type ContentFormatOption } from "@/lib/projects/types";

export type ProjectEdit = {
  masters: MasterOption[];
  artists: ArtistOption[];
  contentFormats: ContentFormatOption[];
  defaults: ProjectFormDefaults;
};

// What the "Modifier" modal of a project row needs. null: gone, archived,
// not visible, or launched (its content is written through its stages).
export async function loadProjectEdit(
  projectId: string,
): Promise<ProjectEdit | null> {
  await requireApproved();
  const [project, masters, artists, contentFormats] = await Promise.all([
    getProject(projectId),
    listMasterOptions(),
    listArtistOptions(),
    listContentFormats(),
  ]);
  if (!project || project.stages.length > 0) return null;
  return {
    masters,
    artists,
    contentFormats,
    defaults: {
      title: project.title,
      type: project.type,
      musicFormat: project.musicFormat,
      contentMode: contentModeOf(project),
      contentFormatId: project.contentFormat?.id ?? null,
      // A collective names its main artist in its own field (lot 5 of
      // docs/pds-mic-plan.md), the content's « Artiste » stays empty.
      artistId: project.collective ? null : project.artistId,
      collective: project.collective,
      mainArtistId: project.collective ? project.artistId : null,
      masterIds: project.masters.map((m) => m.id),
      dueDate: project.dueDate ?? "",
      budget: centsToEuros(project.budgetCents),
      priority: project.priority,
      initialContext: project.initialContext ?? "",
    },
  };
}
