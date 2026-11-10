import Link from "next/link";

import { Field } from "@/components/auth/field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { marketing } from "@/lib/i18n/fr/marketing";
import { marketingReview } from "@/lib/i18n/fr/marketing-review";
import { ANY_FILTER, type DashboardFilters } from "@/lib/marketing/dashboard";
import {
  ACTIVATION_KINDS,
  ACTIVATION_STATUSES,
  VERIFICATIONS,
} from "@/lib/marketing/model";

const fr = { marketing, marketingReview };

const t = fr.marketingReview.dashboard.filters;
const a = fr.marketing.activations;
// A select item cannot hold "": no filter is ANY, ignored when read back
// (filtersFromParams).
const ANY = ANY_FILTER;

/**
 * The dashboard's filters, in the URL (a plain GET form: shareable, works
 * before the page is interactive). « Effacer » goes back to the bare page.
 */
export function DashboardFilterBar({
  action,
  filters,
  owners,
  sources,
}: {
  action: string;
  filters: DashboardFilters;
  owners: { personId: string; name: string }[];
  sources: string[];
}) {
  const options = (entries: [string, string][]) =>
    Object.fromEntries([[ANY, t.any], ...entries]);
  return (
    <form
      method="get"
      action={action}
      aria-label={t.title}
      className="grid gap-4 rounded-2xl border border-[color:var(--border-hairline)] p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field
          id="filter-from"
          name="from"
          type="date"
          label={t.from}
          defaultValue={filters.from ?? ""}
        />
        <Field
          id="filter-to"
          name="to"
          type="date"
          label={t.to}
          defaultValue={filters.to ?? ""}
        />
        <OptionSelect
          id="filter-kind"
          name="kind"
          label={t.kind}
          items={options(ACTIVATION_KINDS.map((k) => [k, a.kinds[k]]))}
          defaultValue={filters.kind ?? ANY}
        />
        <OptionSelect
          id="filter-status"
          name="status"
          label={t.status}
          items={options(ACTIVATION_STATUSES.map((s) => [s, a.statuses[s]]))}
          defaultValue={filters.status ?? ANY}
        />
        <OptionSelect
          id="filter-owner"
          name="owner"
          label={t.owner}
          items={options(owners.map((o) => [o.personId, o.name]))}
          defaultValue={filters.owner ?? ANY}
        />
        <OptionSelect
          id="filter-source"
          name="source"
          label={t.source}
          items={options(sources.map((s) => [s, s]))}
          defaultValue={filters.source ?? ANY}
        />
        <OptionSelect
          id="filter-level"
          name="level"
          label={t.level}
          items={options(
            VERIFICATIONS.map((v) => [
              v,
              fr.marketing.evidence.verifications[v],
            ]),
          )}
          defaultValue={filters.level ?? ANY}
        />
        <OptionSelect
          id="filter-reserve"
          name="reserve"
          label={t.reserve}
          items={options([
            ["open", t.reserveOpen],
            ["none", t.reserveNone],
          ])}
          defaultValue={filters.reserve ?? ANY}
        />
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          render={<Link href={action} />}
          nativeButton={false}
        >
          {t.clear}
        </Button>
        <Button type="submit" size="sm">
          {t.apply}
        </Button>
      </div>
    </form>
  );
}
