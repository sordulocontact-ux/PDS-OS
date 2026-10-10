// The Plan de sortie's HTML: the shared editorial renderer
// (lib/strategy/documents/editorial-html.ts), named for the artist's team.
// Client-safe.

import { fr } from "@/lib/i18n/fr";
import { editorialHtml } from "@/lib/strategy/documents/editorial-html";
import type { ReleasePlanContent } from "@/lib/strategy/documents/release-plan-model";

export { escapeHtml } from "@/lib/strategy/documents/editorial-html";

export function releasePlanHtml(content: ReleasePlanContent): string {
  return editorialHtml(
    content,
    `${fr.strategyReleasePlan.content.kind} · ${content.project.title}`,
  );
}
