// How a project's kind reads everywhere (list, header, overview):
// "Musical · EP", "Contenu · PDS Mic", "Contenu · Contenu ponctuel".

import { shell } from "@/lib/i18n/fr/shell";
import type { MusicFormat, ProjectType } from "@/lib/projects/types";

const fr = { shell };

export type ProjectKind = {
  type: ProjectType;
  musicFormat: MusicFormat | null;
  contentFormatName: string | null;
};

/** The part after the type ("EP", "PDS Mic"); null when there is none. */
export function projectFormatLabel(project: ProjectKind): string | null {
  if (project.type === "music_release")
    return project.musicFormat
      ? fr.shell.musicFormats[project.musicFormat]
      : null;
  if (project.type === "content")
    return (
      project.contentFormatName ??
      fr.shell.newProject.fields.contentModes.one_off
    );
  return null;
}

export function projectKindLabel(project: ProjectKind): string {
  const type = fr.shell.projectTypes[project.type];
  const format = projectFormatLabel(project);
  return format ? `${type} · ${format}` : type;
}

/** The project's date, one name everywhere: the release a musical project
 * aims for, the due date of any other. */
export function projectDateLabel(type: ProjectType): string {
  const t = fr.shell.projectDate;
  return type === "music_release" ? t.music_release : t.other;
}
