import { notFound, redirect } from "next/navigation";

import { routes } from "@/lib/auth/redirects";
import { strategyLanding } from "@/lib/strategy/journey";
import { isStrategyDimension } from "@/lib/strategy/dimensions";
import { strategyStepData } from "@/lib/strategy/step-data";

/**
 * The Stratégie opens on a step of its journey (proto « Projet complet »):
 * the person's own open step, else the first open one. An old link to a
 * dimension (`?d=calendar`, from the Planning) opens « Les 8 dimensions »
 * on it.
 */
export default async function StrategyPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/strategy">) {
  const { projectId } = await params;
  const asked = (await searchParams).d;
  if (isStrategyDimension(asked))
    redirect(routes.projectStrategyDimension(projectId, asked));
  const ctx = await strategyStepData(projectId);
  if (!ctx) notFound();
  redirect(routes.projectStrategyStep(projectId, strategyLanding(ctx.steps)));
}
