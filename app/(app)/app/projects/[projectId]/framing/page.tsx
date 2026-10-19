import { notFound, redirect } from "next/navigation";

import { routes } from "@/lib/auth/redirects";
import { framingJourneyContext } from "@/lib/framing/journey-context";
import { framingLanding } from "@/lib/framing/journey";

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/**
 * The Cadrage's entry: the step that waits for the person looking (their
 * own, else the first open one). The old screens' links (?step=<dimension>
 * &q=…, ?step=review&call=…, ?step=brief, kept in notifications and
 * e-mails) land on their step.
 */
export default async function FramingPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/framing">) {
  const { projectId } = await params;
  const sp = await searchParams;
  const step = first(sp.step);
  const q = first(sp.q);
  if (step === "brief") redirect(routes.projectFramingStep(projectId, "brief"));
  if (step && q) redirect(routes.projectFramingQuestion(projectId, step, q));
  if (step) redirect(routes.projectFramingStep(projectId, "dimensions"));
  const ctx = await framingJourneyContext(projectId);
  if (!ctx) notFound();
  redirect(routes.projectFramingStep(projectId, framingLanding(ctx.steps)));
}
