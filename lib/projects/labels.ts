// How a project's kind reads everywhere (list, header, overview):
// "Musical · EP", "Contenu · PDS Mic", "Contenu · Contenu ponctuel".

import { fr } from "@/lib/i18n/fr";
import type { MusicFormat, ProjectType } from "@/lib/projects/types";

export function projectKindLabel(project: {
  type: ProjectType;
  musicFormat: MusicFormat | null;
  contentFormatName: string | null;
}): string {
  const type = fr.shell.projectTypes[project.type];
  if (project.type === "music_release")
    return project.musicFormat
      ? `${type} · ${fr.shell.musicFormats[project.musicFormat]}`
      : type;
  if (project.type === "content")
    return `${type} · ${
      project.contentFormatName ??
      fr.shell.newProject.fields.contentModes.one_off
    }`;
  return type;
}
