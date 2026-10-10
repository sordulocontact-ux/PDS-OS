import { StatTiles } from "@/components/ui/stat-tiles";
import { fr } from "@/lib/i18n/fr";
import type { PreprodOverview } from "@/lib/production/preprod/overview";
import { daysToShoot } from "@/lib/production/preprod/schedule";
import type { PreprodData } from "@/lib/production/preprod/types";
import { CALL_SHEET_FIELDS } from "@/lib/production/preprod/types";

const t = fr.productionPreprod;

/**
 * Where the preproduction stands, one tile per section, each a link to its
 * block on the page (the tab's navigation: no second row of tabs). Figures
 * computed by code.
 */
export function PreprodSummary({
  overview: o,
  preprod,
  today,
  locationStatus,
}: {
  overview: PreprodOverview;
  preprod: PreprodData;
  today: string;
  locationStatus: keyof typeof t.location.statuses;
}) {
  const s = t.summary;
  const days = daysToShoot(o.logistics, today);
  const live = preprod.items.filter((i) => i.status !== "rejected").length;
  return (
    <nav aria-label={s.label}>
      <StatTiles
        columns={4}
        stats={[
          {
            label: s.briefs,
            value: s.ratio(
              o.briefs.filter((b) => b.state === "transmitted").length,
              o.briefs.length,
            ),
            href: "#briefs",
          },
          { label: s.items, value: String(live), href: "#technical-call" },
          { label: s.plan, value: t.plan.states[o.planState], href: "#plan" },
          {
            label: s.location,
            value: t.location.statuses[locationStatus],
            href: "#location",
          },
          {
            label: s.equipment,
            value: s.ratio(o.equipment.confirmed, o.equipment.total),
            href: "#equipment",
          },
          {
            label: s.shoot,
            value: days === null ? s.noDate : s.days(days),
            href: "#schedule",
          },
          {
            label: s.callSheet,
            value: s.ratio(o.callSheetFilled, CALL_SHEET_FIELDS.length),
            href: "#call-sheet",
          },
          {
            label: s.readiness,
            value: s.ratio(
              o.checks.filter((c) => c.state === "confirmed").length,
              o.checks.filter((c) => c.state !== "not_required").length,
            ),
            href: "#readiness",
          },
        ]}
      />
    </nav>
  );
}
