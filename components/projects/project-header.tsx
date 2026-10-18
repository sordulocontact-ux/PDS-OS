import {
  ProjectHeaderView,
  type ProjectHeaderOverrides,
} from "@/components/projects/project-header-view";
import { projectHeaderData } from "@/lib/projects/header";

/**
 * The head of a module, for a page or a section layout of a launched project
 * that knows more than its URL (docs/ARCHITECTURE.md § 3 ter): its step
 * (`steps`, the open one ends the trail), extra crumbs, its own facts
 * (replacing the project's), its actions (« Qui fait quoi ») and its state.
 * Rendered anywhere in the page, it replaces the layout's default header.
 *
 *   <ProjectHeader projectId={id} steps={steps} actions={<WhoDoesWhat />} />
 */
export async function ProjectHeader({
  projectId,
  isDefault,
  ...overrides
}: ProjectHeaderOverrides & { projectId: string; isDefault?: boolean }) {
  const data = await projectHeaderData(projectId);
  if (!data) return null;
  return <ProjectHeaderView data={data} isDefault={isDefault} {...overrides} />;
}
