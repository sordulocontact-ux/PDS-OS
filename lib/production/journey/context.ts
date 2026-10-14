import "server-only";

import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { loadProductionNext } from "@/lib/production/next/load";
import { loadPhaseFacts, phaseOf } from "@/lib/production/phase";
import { loadProductionSheet } from "@/lib/production/sheet";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import { allInOrder } from "@/lib/utils/parallel";

import { stepHref } from "./href";
import { loadJourney } from "./load";
import { landingStep } from "./steps";
import type { StepKey } from "./types";

/**
 * Everything the deliverable's layout and its step pages share, read once per
 * request: access, the sheet, its phase, the detailed next action (shoot,
 * post, delivery) and the journey for the viewer.
 */
export const journeyContext = cache(
  async (projectId: string, deliverableId: string) => {
    const [access] = await allInOrder([
      requireApproved(),
      requireLaunchedProject(projectId),
    ]);
    const data = await loadProductionSheet(projectId, deliverableId, access);
    if (!data) notFound();
    const facts = await loadPhaseFacts(
      await createClient(),
      data.sheet ? { id: data.sheet.id, readyAt: data.sheet.readyAt } : null,
      deliverableId,
    );
    const phase = phaseOf(facts);
    const next =
      data.heritage.fiche || data.heritage.source
        ? await loadProductionNext(
            projectId,
            deliverableId,
            access,
            data,
            phase,
          )
        : null;
    const steps = await loadJourney(
      projectId,
      deliverableId,
      access,
      data,
      phase,
      next,
    );
    return { access, data, phase, steps };
  },
);

/** A step page: its context and its step; a step this organisation does
 * not have (or a sheet not opened yet) sends to where the viewer lands. */
export async function stepContext(
  projectId: string,
  deliverableId: string,
  key: StepKey,
) {
  const ctx = await journeyContext(projectId, deliverableId);
  const step = ctx.steps.find((s) => s.key === key);
  const sheet = ctx.data.sheet;
  if (!step || (!sheet && key !== "organisation"))
    redirect(
      stepHref(projectId, deliverableId, landingStep(ctx.steps)) ??
        routes.projectProduction(projectId),
    );
  return { ...ctx, step };
}
