import { redirect } from "next/navigation";

import { routes } from "@/lib/auth/redirects";

/**
 * The Brief de sortie is validated in its step now (proto « Projet
 * complet »): the old page redirects there, at the version asked.
 */
export default async function StrategyBriefPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/strategy/brief">) {
  const { projectId } = await params;
  const v = Number((await searchParams).v);
  redirect(
    Number.isInteger(v) && v > 0
      ? routes.projectStrategyBriefVersion(projectId, v)
      : routes.projectStrategyBrief(projectId),
  );
}
