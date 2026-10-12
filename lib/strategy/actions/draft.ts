"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { routes } from "@/lib/auth/redirects";
import { orgId } from "@/lib/framing/actions/shared";
import {
  draftStrategy,
  summarizeNarrative,
  type DraftResult,
  type SummaryResult,
} from "@/lib/strategy/draft";
import { DRAFT_FIELDS } from "@/lib/strategy/draft-plan";
import {
  SUMMARY_LENGTHS,
  SUMMARY_TONES,
} from "@/lib/strategy/narrative-review";

// Every write goes through the user's session: RLS lets only the owner write,
// and only while the strategy is in progress (strategy_is_editable).

const draftInput = z.object({
  projectId: z.uuid(),
  only: z.enum(DRAFT_FIELDS).nullable(),
});

/** « Préparer un brouillon », or « Proposer à nouveau » for one field. */
export async function prepareStrategyDraft(
  projectId: string,
  only: string | null = null,
): Promise<DraftResult> {
  const parsed = draftInput.safeParse({ projectId, only });
  const organizationId = await orgId();
  if (!parsed.success || !organizationId) return { ok: false, error: "write" };
  const result = await draftStrategy(
    organizationId,
    parsed.data.projectId,
    parsed.data.only,
  );
  if (result.ok) revalidatePath(routes.projectStrategy(projectId));
  return result;
}

const summaryInput = z.object({
  projectId: z.uuid(),
  tone: z.enum(SUMMARY_TONES),
  length: z.enum(SUMMARY_LENGTHS),
});

/** « Rédiger la synthèse » of the narrative. */
export async function writeNarrativeSummary(
  projectId: string,
  tone: string,
  length: string,
): Promise<SummaryResult> {
  const parsed = summaryInput.safeParse({ projectId, tone, length });
  const organizationId = await orgId();
  if (!parsed.success || !organizationId)
    return { ok: false, error: "invalid" };
  const result = await summarizeNarrative(
    organizationId,
    parsed.data.projectId,
    parsed.data.tone,
    parsed.data.length,
  );
  if (result.ok) revalidatePath(routes.projectStrategy(projectId));
  return result;
}
