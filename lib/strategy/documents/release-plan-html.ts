// The Plan de sortie's HTML: the shared editorial renderer
// (lib/strategy/documents/editorial-html.ts), named for the artist's team.
// Client-safe.

import { strategyReleasePlan } from "@/lib/i18n/fr/strategy-release-plan";
import { editorialHtml } from "@/lib/strategy/documents/editorial-html";
import type { ReleasePlanContent } from "@/lib/strategy/documents/release-plan-model";

const fr = { strategyReleasePlan };

export { escapeHtml } from "@/lib/strategy/documents/editorial-html";

export function releasePlanHtml(content: ReleasePlanContent): string {
  return editorialHtml(
    content,
    `${fr.strategyReleasePlan.content.kind} · ${content.project.title}`,
  );
}
