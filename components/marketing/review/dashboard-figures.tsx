import { StatTiles } from "@/components/ui/stat-tiles";
import { formatEuros } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
import {
  FIGURE_GROUPS,
  type Dashboard,
  type FigureGroup,
  type FigureKey,
} from "@/lib/marketing/dashboard";

const t = fr.marketingReview.dashboard;
const number = new Intl.NumberFormat("fr-FR");

/**
 * The dashboard's figures, group by group. Each tile opens its detail (the
 * records behind it and its rule) when `hrefOf` is given — a report shows
 * them frozen, without links; `groups` picks the groups shown. A figure that
 * cannot be known reads « Indisponible », never 0.
 */
export function DashboardFigures({
  dashboard,
  budgetRestricted,
  detail = null,
  hrefOf,
  groups = Object.keys(FIGURE_GROUPS) as FigureGroup[],
  headings = true,
}: {
  dashboard: Dashboard;
  budgetRestricted: boolean;
  detail?: FigureKey | null;
  hrefOf?: (key: FigureKey) => string;
  groups?: FigureGroup[];
  // False when the caller's own section already names the only group.
  headings?: boolean;
}) {
  const format = (key: FigureKey) => {
    const value = dashboard.figures[key].value;
    if (value === null) return t.unavailable;
    return key.startsWith("budget_")
      ? formatEuros(value)
      : number.format(value);
  };
  return (
    <div className="grid gap-8">
      {groups.map((group) => (
        <section
          key={group}
          aria-labelledby={`group-${group}`}
          className="grid gap-3"
        >
          {headings && (
            <div className="grid gap-0.5">
              <h3 id={`group-${group}`} className="text-base font-medium">
                {t.groups[group]}
              </h3>
              <p className="text-sm text-muted-foreground">
                {group === "budget" && budgetRestricted
                  ? t.budgetRestricted
                  : t.groupHints[group]}
              </p>
            </div>
          )}
          {!(group === "budget" && budgetRestricted) && (
            <StatTiles
              columns={FIGURE_GROUPS[group].length === 5 ? 5 : 4}
              stats={FIGURE_GROUPS[group].map((key) => ({
                label: t.figures[key],
                value: format(key),
                ...(hrefOf
                  ? { href: hrefOf(key), view: { current: detail === key } }
                  : {}),
              }))}
            />
          )}
        </section>
      ))}
    </div>
  );
}
