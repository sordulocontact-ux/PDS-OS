import "server-only";

import { pageRecord } from "@/lib/assistant/page-context";
import { findNamed } from "@/lib/assistant/propose/match";
import type { Access } from "@/lib/auth/access";
import { loadMembers, type Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { canEditProject } from "@/lib/projects/edit-access";
import { listProjects } from "@/lib/projects/queries";
import type { ProjectListItem } from "@/lib/projects/types";

// What a proposal points at, found by code: a project by its name or the page
// PO was opened from, a member by their name. Never an id from the model.

type Refusal = { facts: string[]; sources: [] };
const refuse = (fact: string): Refusal => ({ facts: [fact], sources: [] });

/**
 * The launched project a task or a budget line goes into, written only by its
 * owner (is_project_owner in SQL): named, or the open page's project.
 */
export async function ownedLaunchedProject(
  access: Access,
  name: string | undefined,
  pagePath: string | null | undefined,
  warnings: string[],
): Promise<ProjectListItem | Refusal> {
  const t = fr.assistantRecords;
  const { projects } = await listProjects();
  const page = pageRecord(pagePath);
  const project = name?.trim()
    ? findNamed(projects, name, (p) => p.title, warnings)
    : page?.kind === "project"
      ? (projects.find((p) => p.id === page.id) ?? null)
      : null;
  if (!project)
    return refuse(
      name
        ? fr.assistant.drafts.notFound(t.what.project, name)
        : t.whichProject,
    );
  if (project.status !== "launched")
    return refuse(t.notLaunched(project.title));
  if (!canEditProject(access, project))
    return refuse(t.notOwner(project.title));
  return project;
}

export function isRefusal<T>(value: T | Refusal): value is Refusal {
  return typeof value === "object" && value !== null && "facts" in value;
}

/** Members matched by name; an unknown name is said, never guessed. */
export async function namedMembers(
  access: Access,
  names: readonly string[],
  warnings: string[],
): Promise<Member[]> {
  if (names.length === 0) return [];
  const members = await loadMembers(access);
  return names.flatMap((name) => {
    const found = findNamed(members, name, (m) => m.name, warnings);
    if (!found) warnings.push(fr.assistantRecords.unknownMember(name));
    return found ? [found] : [];
  });
}
