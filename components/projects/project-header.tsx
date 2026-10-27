import { ProjectFresh } from "@/components/projects/project-fresh";
import {
  ProjectHeaderSkeleton,
  ProjectHeaderView,
  type ProjectHeaderOverrides,
} from "@/components/projects/project-header-view";
import { projectHeaderData } from "@/lib/projects/header";

type Facts = ProjectHeaderOverrides["facts"];
type Props = Omit<ProjectHeaderOverrides, "facts"> & {
  projectId: string;
  isDefault?: boolean;
  // A module's own facts, or the promise of them (read with the header,
  // never before the page).
  facts?: Facts | Promise<Facts>;
};

async function LoadedProjectHeader({
  projectId,
  isDefault,
  facts: factsOf,
  ...overrides
}: Props) {
  const [data, facts] = await Promise.all([
    projectHeaderData(projectId),
    factsOf,
  ]);
  if (!data) return null;
  return (
    <ProjectHeaderView
      data={data}
      isDefault={isDefault}
      facts={facts}
      {...overrides}
    />
  );
}

/**
 * The head of a module, for a page or a section layout of a launched project
 * that knows more than its URL (docs/ARCHITECTURE.md § 3 ter): its step
 * (`steps`, the open one ends the trail), extra crumbs, its own facts
 * (replacing the project's), its actions (« Qui fait quoi ») and its state.
 * Rendered anywhere in the page, it replaces the layout's default header.
 * Its facts come from every workflow's state: the page never waits for
 * them, the header last shown staying until they are read (ProjectFresh).
 *
 *   <ProjectHeader projectId={id} steps={steps} actions={<WhoDoesWhat />} />
 */
export function ProjectHeader(props: Props) {
  return (
    <ProjectFresh
      projectId={props.projectId}
      id={props.isDefault ? "project-header" : "page-header"}
      fallback={<ProjectHeaderSkeleton isDefault={props.isDefault} />}
    >
      <LoadedProjectHeader {...props} />
    </ProjectFresh>
  );
}
