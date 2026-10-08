// The actions of each title of the plan: its publishing split, then its
// SACEM declaration, which waits for the creators' fiches, the split and
// the title's clearances (Juridique 04 and 06). Pure.

import type { ContributorRole } from "@/lib/catalog/master/rules";
import { fr } from "@/lib/i18n/fr";
import type { InventoryRows } from "@/lib/legal/inventory-rows";
import type { PlanItem } from "@/lib/legal/plan/proposal";

// Roles that make someone a creator of the work (the SACEM bulletin lists
// authors, composers and arrangers).
const CREATOR_ROLES: readonly ContributorRole[] = [
  "composer",
  "lyricist",
  "arranger",
];

const t = fr.legal.plan.items;

export function titleItems(
  rows: InventoryRows,
  afterOnboarding: string[],
  clearances: PlanItem[],
): PlanItem[] {
  return rows.titles.flatMap((master): PlanItem[] => {
    const creators = (rows.creditsOf.get(master.id) ?? []).filter((c) =>
      CREATOR_ROLES.includes(c.role),
    );
    const splits: PlanItem[] =
      creators.length > 0
        ? [
            {
              key: `splits:${master.id}`,
              kind: "splits",
              masterId: master.id,
              label: t.splits(master.title),
              detail: [...new Set(creators.map((c) => c.name))].join(", "),
              why: t.splitsWhy,
              subject: master.title,
              creditIds: [],
              column: afterOnboarding.length > 0 ? "later" : "now",
              status: afterOnboarding.length > 0 ? "blocked" : "action_now",
              dependsOn: afterOnboarding,
            },
          ]
        : [];
    // Only a confirmed declaration is done (same rule as the Suivi and
    // legal_plan_item_done): a submitted one can still be refused, so it
    // stays in the plan, followed until the SACEM registers it.
    const filed =
      rows.filedOf.get(master.id)?.get("sacem")?.status === "confirmed";
    const waits = [
      ...afterOnboarding,
      ...splits.map((s) => s.key),
      ...clearances.filter((c) => c.masterId === master.id).map((c) => c.key),
    ];
    const formality: PlanItem[] = filed
      ? []
      : [
          {
            key: `formality:${master.id}`,
            kind: "formality",
            masterId: master.id,
            label: t.formality(master.title),
            detail: null,
            why: t.formalityWhy,
            subject: master.title,
            creditIds: [],
            column: waits.length > 0 ? "later" : "now",
            status: waits.length > 0 ? "blocked" : "action_now",
            dependsOn: waits,
          },
        ];
    return [...splits, ...formality];
  });
}
