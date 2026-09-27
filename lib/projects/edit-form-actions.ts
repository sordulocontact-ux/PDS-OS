"use server";

import type { ProjectFormDefaults } from "@/components/projects/create-project-form";
import { centsToEuros } from "@/lib/assistant/drafts";
import { requireApproved } from "@/lib/auth/dal";
import { listArtistOptions, listMasterOptions } from "@/lib/catalog/queries";
import type { ArtistOption, MasterOption } from "@/lib/catalog/types";
import { getProject } from "@/lib/projects/queries";

export type ProjectEdit = {
  masters: MasterOption[];
  artists: ArtistOption[];
  defaults: ProjectFormDefaults;
};

// What the "Modifier" modal of a project row needs. null: gone, archived,
// not visible, or launched (its content is written through its stages).
export async function loadProjectEdit(
  projectId: string,
): Promise<ProjectEdit | null> {
  await requireApproved();
  const [project, masters, artists] = await Promise.all([
    getProject(projectId),
    listMasterOptions(),
    listArtistOptions(),
  ]);
  if (!project || project.stages.length > 0) return null;
  return {
    masters,
    artists,
    defaults: {
      title: project.title,
      type: project.type,
      masterIds: project.masters.map((m) => m.id),
      dueDate: project.dueDate ?? "",
      budget: centsToEuros(project.budgetCents),
      priority: project.priority,
      framingNotes: project.framingNotes ?? "",
    },
  };
}
