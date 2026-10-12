// « L'essentiel » of the Brief de sortie (MKT-S1-14): one page read first —
// objective, publics, angle, dispositif, key milestones, budget, KPIs,
// risks and what is missing — taken from the snapshot's own sections, so
// the summary never says anything the detail does not. Pure, client-safe.

import { fr } from "@/lib/i18n/fr";
import type {
  BriefSnapshot,
  SnapshotItem,
} from "@/lib/strategy/documents/brief-snapshot";
import type { StrategyDimension } from "@/lib/strategy/dimensions";

export type SummaryRow = {
  key: string;
  label: string;
  value: string | null;
  warn: boolean;
};

const lineText = (l: { head: string | null; rest: string | null }) =>
  [l.head, l.rest].filter(Boolean).join(" · ");

function firstValue(items: SnapshotItem[]): string | null {
  for (const item of items) {
    if (item.value) return item.value;
    if (item.lines.length) return item.lines.map(lineText).join(" ; ");
  }
  return null;
}

/** At most `max` lines of a section, then « +n ». */
function lines(items: SnapshotItem[], max: number): string | null {
  const all = items.flatMap((i) => i.lines.filter((l) => !l.warn));
  if (all.length === 0) return null;
  const shown = all.slice(0, max).map(lineText).join(" ; ");
  return all.length > max ? `${shown} ; +${all.length - max}` : shown;
}

export function briefSummary(snapshot: BriefSnapshot): SummaryRow[] {
  const t = fr.strategyBrief.summary;
  const of = (d: StrategyDimension) =>
    snapshot.sections.find((s) => s.dimension === d);
  const row = (
    key: StrategyDimension,
    label: string,
    value: string | null,
  ): SummaryRow => ({
    key,
    label,
    value,
    warn: of(key)?.toDecide ?? false,
  });
  const narrative = of("narrative")?.items ?? [];
  const angle =
    narrative.find((i) => i.label === fr.strategyBrief.sections.narrativeAngle)
      ?.value ?? null;
  return [
    row("objectives", t.objective, firstValue(of("objectives")?.items ?? [])),
    row("audiences", t.audiences, firstValue(of("audiences")?.items ?? [])),
    row("narrative", t.angle, angle),
    row("levers", t.levers, lines(of("levers")?.items ?? [], 4)),
    row("calendar", t.milestones, lines(of("calendar")?.items ?? [], 3)),
    row("budget", t.budget, firstValue(of("budget")?.items ?? [])),
    row(
      "objectives",
      t.kpis,
      lines(
        (of("objectives")?.items ?? []).filter((i) => i.lines.length),
        3,
      ),
    ),
    {
      key: "risks",
      label: t.risks,
      value: snapshot.toDecide.length
        ? snapshot.toDecide
            .slice(0, 3)
            .map((d) => d.text)
            .join(" ; ") +
          (snapshot.toDecide.length > 3
            ? ` ; +${snapshot.toDecide.length - 3}`
            : "")
        : null,
      warn: snapshot.toDecide.length > 0,
    },
  ];
}
