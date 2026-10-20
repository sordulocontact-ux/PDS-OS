import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProjectFrame } from "@/components/projects/project-frame";
import { PageLoading } from "@/components/shell/page-loading";
import { requireApproved } from "@/lib/auth/dal";
import { planLaunchedAt, planWorkflows } from "@/lib/plan/queries";
import { getProject } from "@/lib/projects/queries";
import { missingProjectRecord } from "@/lib/projects/record-guard";
import { allInOrder } from "@/lib/utils/parallel";
import { loadWorkflowStates } from "@/lib/workflow-status/load";

// Swallows the rejection of a read started early: whoever awaits it later
// still gets it (the reads are cached per request).
const started = (promise: Promise<unknown>) => void promise.catch(() => {});

/**
 * A project's frame. A project that does not exist (or that RLS hides)
 * answers a real 404 (docs/ARCHITECTURE.md § 3 bis): the project is read
 * here, before any Suspense boundary (no `loading.tsx` above this layout),
 * so `notFound()` comes before the response starts. Only that one read is
 * waited for; the frame's other reads (workflow states, plan) start at the
 * same time and are awaited by ProjectFrame under a Suspense, the page
 * frame (PageLoading) showing meanwhile, as before. Pages below still check
 * access themselves (a layout does not re-run on client navigation); the
 * project query is cached per request, so they reuse it for free.
 */
export default async function ProjectLayout({
  children,
  params,
}: LayoutProps<"/app/projects/[projectId]">) {
  const { projectId } = await params;
  started(loadWorkflowStates(projectId));
  started(planLaunchedAt(projectId));
  started(planWorkflows(projectId));
  const [access, project, missing] = await allInOrder([
    requireApproved(),
    getProject(projectId),
    // A record under the project (livrable, activation, call…) it does not
    // have: a real 404 too, decided before the section's skeleton streams.
    missingProjectRecord(projectId),
  ]);
  if (!project || missing) notFound();
  return (
    <Suspense fallback={<PageLoading />}>
      <ProjectFrame access={access} project={project}>
        {children}
      </ProjectFrame>
    </Suspense>
  );
}
