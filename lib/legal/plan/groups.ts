// The actions of a plan grouped by kind (Sacha's feedback of 05/10/2026: « il
// y a beaucoup de répétitions »): what they share (why they exist, what they
// wait for, where they are done) is said once for the group, each line keeps
// only its subject. Pure.

import { fr } from "@/lib/i18n/fr";
import { type PlanItemKind } from "@/lib/legal/plan/proposal";

// In the order they unlock: the fiches and the borrowings start together
// (ticket Juridique 07: « Réseau et Humanisme démarrent en parallèle »),
// the contracts and the splits wait for the fiches, the SACEM for the rest.
const ORDER: PlanItemKind[] = [
  "onboarding",
  "clearance",
  "contract",
  "splits",
  "formality",
];

export type ActionGroup<T> = {
  kind: PlanItemKind;
  title: string;
  why: string | null;
  // Labels of what every action of the group waits for, when they share it.
  after: string[];
  items: T[];
};

type Groupable = {
  kind: PlanItemKind;
  why: string | null;
  dependsOn: string[];
};

export function groupActions<T extends Groupable>(
  items: T[],
  labelOf: Map<string, string>,
): ActionGroup<T>[] {
  return ORDER.flatMap((kind) => {
    const theirs = items.filter((item) => item.kind === kind);
    if (theirs.length === 0) return [];
    const whys = new Set(theirs.map((item) => item.why ?? ""));
    const deps = new Set(theirs.map((item) => item.dependsOn.join("|")));
    return [
      {
        kind,
        title: fr.legal.plan.groups[kind],
        why: whys.size === 1 ? (theirs[0].why ?? null) : null,
        after:
          deps.size === 1
            ? theirs[0].dependsOn.flatMap((key) => labelOf.get(key) ?? [])
            : [],
        items: theirs,
      },
    ];
  });
}

/** What a line of a group still has to say on its own. */
export function lineOf(
  item: Groupable & {
    subject: string | null;
    label: string;
    detail: string | null;
  },
  group: ActionGroup<unknown>,
  labelOf: Map<string, string>,
) {
  const sharedAfter = group.after.length > 0 || item.dependsOn.length === 0;
  // The subject alone (a person, a title); an action about several people
  // (the fiches) names them instead of repeating its group's name.
  const title = item.subject ?? item.detail ?? item.label;
  return {
    title,
    detail: title === item.detail ? null : item.detail,
    why: group.why === null ? item.why : null,
    after: sharedAfter
      ? []
      : item.dependsOn.flatMap((key) => labelOf.get(key) ?? []),
  };
}
