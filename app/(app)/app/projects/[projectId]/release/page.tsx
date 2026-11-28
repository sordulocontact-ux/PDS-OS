import { notFound, redirect } from "next/navigation";

import { distributionContext } from "@/lib/distribution/journey-context";
import { distributionEntry } from "@/lib/journey/landing";
import { isUuid } from "@/lib/release/uuid";
import { routes } from "@/lib/auth/redirects";
import { releaseParamOf } from "@/lib/distribution/scope";
import { getProject } from "@/lib/projects/queries";
import { carriedTitle } from "@/lib/projects/title-carry";
import { loadTitleDeposits } from "@/lib/release/collective-releases";

async function collectiveRelease(
  projectId: string,
  query: Record<string, string | string[] | undefined>,
): Promise<string | null> {
  const title = await carriedTitle(projectId, query);
  // A title named: its release (or the compilation it goes out with), else
  // « Sorties », the Distribution's list (mode, dates, UPC), never another
  // title's release.
  if (!title) return null;
  return (await loadTitleDeposits(projectId))[title.id]?.releaseId ?? null;
}

// /release opens the Distribution's step that awaits the viewer, else the
// one in progress (docs/VISION-UX.md § 4, « On arrive au bon endroit »).
export default async function ReleasePage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/release">) {
  const { projectId } = await params;
  if (!isUuid(projectId)) notFound();
  const query = await searchParams;
  // A collective's Distribution is a release's (lot 15): the one named, else
  // the release of the title named (from another workflow of the same
  // title, lib/projects/title-carry-rules.ts: its own, or the compilation it
  // goes out with), else « Sorties », which lists them (Sacha, 28/11/2026:
  // never one chosen by the code).
  const named = releaseParamOf(query);
  const project = await getProject(projectId);
  const releaseId =
    project?.collective && !named
      ? await collectiveRelease(projectId, query)
      : named;
  if (project?.collective && !releaseId)
    redirect(routes.projectReleases(projectId));
  const ctx = await distributionContext(
    projectId,
    project?.collective ? releaseId : null,
  );
  redirect(
    distributionEntry(projectId, ctx?.steps ?? [], ctx?.releaseId ?? null),
  );
}
