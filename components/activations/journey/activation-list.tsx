import { FilterChipLink } from "@/components/ui/filter-chip";
import { PhaseStrip } from "@/components/ui/phase-strip";
import { ViewLink } from "@/components/ui/view-link";
import {
  ACTIVATION_FILTERS,
  type ActivationFilter,
  activationSentence,
  filtersOf,
} from "@/lib/activations/journey";
import { phaseLabel, phaseOf } from "@/lib/activations/phase";
import type { ActivationSummary } from "@/lib/activations/types";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { formatDay } from "@/lib/utils/day";
import { viewHref } from "@/lib/ui/view-href";

const t = fr.activationJourney;

export type ListRow = ActivationSummary & { ownerName: string | null };

/** `vue` of the URL: « En cours » by default (proto). */
export const filterOf = (value: unknown): ActivationFilter =>
  ACTIVATION_FILTERS.find((f) => f === value) ?? "open";

/**
 * The activations on the left (proto actPage, 18/10): « À moi », « En
 * cours », « À mesurer », « Terminées » with their counts; one line per
 * activation — title, type · mode · owner · due date, the frieze and what
 * it waits for (« À vous · … » in blue). The open one stays listed even when
 * it leaves the filter (an activation just handled does not vanish).
 */
export function ActivationList({
  projectId,
  rows,
  openId,
  filter,
  footer,
}: {
  projectId: string;
  rows: ListRow[];
  openId: string | null;
  filter: ActivationFilter;
  // « Nouvelle activation » for an action out of the levers (ticket).
  footer?: React.ReactNode;
}) {
  const shown = rows.filter(
    (a) => a.id === openId || filtersOf(a, a.actions).includes(filter),
  );
  const vue = (f: ActivationFilter) => (f === "open" ? null : f);
  return (
    <nav
      aria-label={t.listTitle}
      className="flex flex-col gap-1 rounded-2xl border border-[color:var(--border-hairline)] bg-card p-3 min-[900px]:sticky min-[900px]:top-5"
    >
      <h2 className="px-2 pt-1 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
        {t.listTitle}
      </h2>
      <div
        role="group"
        aria-label={t.filters.label}
        className="mb-1.5 flex flex-wrap gap-1.5 px-1 pt-1"
      >
        {ACTIVATION_FILTERS.map((f) => (
          <FilterChipLink
            key={f}
            variant="soft"
            current={f === filter}
            href={viewHref(
              openId
                ? routes.projectActivation(projectId, openId)
                : routes.projectActivations(projectId),
              { vue: vue(f) },
            )}
          >
            {t.filters[f]}
            <span className="text-[color:var(--text-tertiary)]">
              {rows.filter((a) => filtersOf(a, a.actions).includes(f)).length}
            </span>
          </FilterChipLink>
        ))}
      </div>
      {shown.length === 0 && (
        <p className="px-2 py-2 text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
          {t.noneHere}
        </p>
      )}
      <ul className="flex flex-col gap-0.5">
        {shown.map((a) => {
          const open = a.id === openId;
          const sentence = activationSentence(
            {
              ...a,
              waitsFor: a.waitsFor,
              closedFigure: a.lastFigure,
            },
            a.actions,
          );
          return (
            <li key={a.id}>
              <ViewLink
                href={viewHref(routes.projectActivation(projectId, a.id), {
                  vue: vue(filter),
                })}
                aria-current={open ? "page" : undefined}
                className={cn(
                  "flex flex-col gap-1 rounded-lg p-3 text-left no-underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  open
                    ? "bg-[var(--surface-sunken)]"
                    : "[@media(hover:hover)]:hover:bg-[var(--surface-soft)]",
                )}
              >
                <span className="text-[length:var(--type-body-sm)] leading-snug font-semibold break-words">
                  {a.title}
                </span>
                <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]">
                  {[
                    fr.activations.kinds[a.kind],
                    a.mode ? fr.activations.modes[a.mode] : null,
                    a.ownerName ?? t.ownerToAppoint,
                    a.dueOn ? formatDay(a.dueOn).replace(/\/\d{4}$/, "") : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <PhaseStrip
                  phases={t.phases}
                  current={Math.min(phaseOf(a), t.phases.length)}
                  label={phaseLabel(a)}
                  className="my-0.5"
                />
                <span
                  className={cn(
                    "text-[length:var(--type-caption)] leading-[var(--type-caption-lh)]",
                    sentence.mine
                      ? "font-semibold text-[color:var(--selection)]"
                      : "text-[color:var(--text-secondary)]",
                  )}
                >
                  {sentence.text}
                </span>
              </ViewLink>
            </li>
          );
        })}
      </ul>
      {footer && <div className="px-1 pt-1">{footer}</div>}
    </nav>
  );
}
