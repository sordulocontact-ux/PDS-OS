// Projet collectif, lot 10 (docs/pds-mic-plan.md § 3.1, principle 3): the
// titles a marketing action targets (deliverable_titles). Pure: shared by
// the server and the client.

import { projectTitles } from "@/lib/i18n/fr/project-titles";

const fr = { projectTitles };

/** « Tout le projet » (no row, the default), « Tous les titres » (those
 * added later too), « Certains titres », « Aucun titre ». */
export const TITLE_SCOPES = [
  "project",
  "all_titles",
  "titles",
  "none",
] as const;
export type TitleScopeKind = (typeof TITLE_SCOPES)[number];

export type ActionTitleScope = { kind: TitleScopeKind; titleIds: string[] };

export const PROJECT_SCOPE: ActionTitleScope = {
  kind: "project",
  titleIds: [],
};

/** A title of the collective as the scopes name it. */
export type ScopeTitle = { id: string; label: string; abandoned: boolean };

export function titleScopeKindOf(value: string): TitleScopeKind {
  return (TITLE_SCOPES as readonly string[]).includes(value)
    ? (value as TitleScopeKind)
    : "project";
}

/** The scope in words: « Néons, Lumière » (an abandoned title said so). */
export function titleScopeLabel(
  scope: ActionTitleScope,
  titles: ScopeTitle[],
): string {
  const t = fr.projectTitles.scope;
  if (scope.kind !== "titles") return t.kinds[scope.kind];
  const names = titles
    .filter((title) => scope.titleIds.includes(title.id))
    .map((title) => (title.abandoned ? t.abandoned(title.label) : title.label));
  return names.length > 0 ? names.join(", ") : t.kinds.titles;
}

/** Whether the action concerns the title (the filter by title): the whole
 * project and all the titles do, a selection does when it holds it, « no
 * title » never. */
export function titleScopeCovers(
  scope: ActionTitleScope,
  titleId: string,
): boolean {
  switch (scope.kind) {
    case "project":
    case "all_titles":
      return true;
    case "titles":
      return scope.titleIds.includes(titleId);
    case "none":
      return false;
  }
}
