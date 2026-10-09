import "server-only";

import { fr } from "@/lib/i18n/fr";
import { getProject } from "@/lib/projects/queries";
import type { ProjectDetail } from "@/lib/projects/types";
import type { SnapshotProject } from "@/lib/strategy/brief-snapshot";

/** "Musical · Single": the project's kind as the documents name it. */
export function projectKindLabel(project: ProjectDetail): string {
  const shell = fr.shell;
  return [
    shell.projectTypes[project.type],
    project.musicFormat ? shell.musicFormats[project.musicFormat] : null,
    project.contentFormat?.name ?? null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function snapshotProject(
  project: ProjectDetail,
  releaseDate: string | null,
): SnapshotProject {
  return {
    title: project.title,
    artist: project.artistName,
    type: projectKindLabel(project),
    releaseDate,
  };
}

/** The same, read with the user's session (RLS decides). */
export async function snapshotProjectOf(
  projectId: string,
  releaseDate: string | null,
): Promise<SnapshotProject | null> {
  const project = await getProject(projectId);
  return project ? snapshotProject(project, releaseDate) : null;
}
