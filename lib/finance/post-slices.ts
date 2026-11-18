// The slices of « Répartition par poste » (Ibé's ticket): what the lines
// cost now by poste, the four largest and the rest, each poste in its own
// shade (`postShade`, the same as its square in the spends' table). Shared
// by Finance's PostPie and PO's chart (show_chart). Client-safe, pure code.
import type { DonutSlice } from "@/components/ui/donut-chart";
import type { PostRow } from "@/lib/finance/envelopes";
import { budget } from "@/lib/i18n/fr/budget";
import { financeBudgets } from "@/lib/i18n/fr/finance-budgets";
import { distinctShades, postShade } from "@/lib/ui/category-hues";

const SHOWN = 4;

export function postSlices(posts: PostRow[]): DonutSlice[] {
  const t = financeBudgets.pie;
  const restCents = posts
    .slice(SHOWN)
    .reduce((s, p) => s + p.totals.projectedCents, 0);
  const raw = [
    ...posts.slice(0, SHOWN).map((p) => ({
      key: p.family ?? "none",
      label: p.family ? budget.families[p.family] : t.none,
      cents: p.totals.projectedCents,
      shade: postShade(p.family),
    })),
    {
      key: "rest",
      label: t.rest,
      cents: restCents,
      shade: postShade(null),
    },
  ];
  const shades = distinctShades(raw.map((x) => x.shade));
  return raw.map((x, i) => ({ ...x, shade: shades[i] }));
}
