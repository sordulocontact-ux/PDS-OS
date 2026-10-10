import "server-only";

import { fr } from "@/lib/i18n/fr";
import type { StrategyPageData } from "@/lib/strategy/page-data";
import { approvedOf } from "@/lib/strategy/workspace";

/**
 * Why a generator cannot open for this person now, or null: only the
 * project's owner prepares the external documents, from a validated Brief
 * de sortie, never while a Brief version waits for its reviewers (the
 * database refuses the same in create_strategy_document).
 */
export function generatorLock(page: StrategyPageData): string | null {
  const t = fr.strategyDocs.generator;
  const docs = page.ctx.documents;
  if (!page.canEdit) return t.locked;
  if (!approvedOf(docs, "brief")) return t.needsBrief;
  if (docs.some((d) => d.kind === "brief" && d.state === "sent"))
    return t.pending;
  return null;
}

/** The step in the URL, kept within the generator's steps. */
export function stepOf(raw: string | string[] | undefined, total: number) {
  const value = Number.parseInt(Array.isArray(raw) ? raw[0] : (raw ?? ""), 10);
  return Number.isFinite(value) ? Math.min(Math.max(value, 1), total) : 1;
}
