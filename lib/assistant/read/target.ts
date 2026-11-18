import "server-only";

import { pageRecord } from "@/lib/assistant/page-context";
import { findNamed } from "@/lib/assistant/propose/match";
import type { Display } from "@/lib/assistant/display";
import type { Source } from "@/lib/assistant/sources";
import { routes } from "@/lib/auth/redirects";
import { assistantRead } from "@/lib/i18n/fr/assistant-read";
import { listProjects } from "@/lib/projects/queries";
import type { ProjectListItem } from "@/lib/projects/types";

const fr = { assistantRead };

/**
 * What every read_* function of PO returns (docs/ASSISTANT.md § 3):
 * sentences written by code, never raw states, and the links shown under
 * the answer.
 */
export type ReadResult = {
  facts: string[];
  sources: Source[];
  // Nothing found or a failed read: counted in Notion, never with the
  // question (lib/assistant/gaps.ts).
  gap?: "missing" | "failed";
  // A chart or a file shown under the answer (lib/assistant/display.ts).
  display?: Display;
};

export const readFailed = (): ReadResult => ({
  facts: [fr.assistantRead.failed],
  sources: [],
  gap: "failed",
});

/**
 * The project a read function is about: the one named (spelling forgiven,
 * a correction said), else the open page's. Never an id from the model.
 * Visible projects only (RLS).
 */
export async function targetProject(
  name: string | undefined,
  pagePath: string | null,
): Promise<{ project: ProjectListItem; notes: string[] } | ReadResult> {
  const notes: string[] = [];
  const { projects } = await listProjects();
  const page = pageRecord(pagePath);
  const project = name?.trim()
    ? findNamed(projects, name, (p) => p.title, notes)
    : page?.kind === "project"
      ? (projects.find((p) => p.id === page.id) ?? null)
      : null;
  if (!project)
    return {
      facts: [
        name?.trim()
          ? fr.assistantRead.projectNotFound(name.trim())
          : fr.assistantRead.whichProject,
      ],
      sources: [],
      ...(name?.trim() ? { gap: "missing" as const } : {}),
    };
  return { project, notes };
}

export function isReadResult(value: unknown): value is ReadResult {
  return typeof value === "object" && value !== null && "facts" in value;
}

/** « Liste limitée aux 20 premiers » when a list was cut (audit § 3.5). */
export function capped(total: number, shown: number): string[] {
  return total > shown ? [fr.assistantRead.capped(shown, total)] : [];
}

export const projectSource = (project: { id: string; title: string }) => ({
  label: project.title,
  href: routes.project(project.id),
});
