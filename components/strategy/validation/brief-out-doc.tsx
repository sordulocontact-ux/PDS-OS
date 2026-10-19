import type { ReactNode } from "react";

import { StatTiles } from "@/components/ui/stat-tiles";
import { InfoRow, Rows } from "@/components/ui/rows";
import { StatusBadge } from "@/components/ui/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { VersionCard } from "@/components/ui/version-card";
import { formatEuros } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
import type { BriefOut } from "@/lib/strategy/brief-out";
import { dayLabel } from "@/lib/strategy/dimension-model";
import { formatDay } from "@/lib/utils/day";

const t = fr.strategyBriefOut.doc;
const euros = (cents: number) =>
  fr.strategyDimensions.budget.amount(formatEuros(cents));

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h4 className="text-body-sm font-semibold text-[color:var(--text-secondary)]">
        {title}
      </h4>
      {children}
    </section>
  );
}

const Chips = ({ list }: { list: string[] }) =>
  list.length ? (
    <span className="flex flex-wrap gap-1.5">
      {list.map((x) => (
        <StatusBadge key={x} tone="neutral" size="sm">
          {x}
        </StatusBadge>
      ))}
    </span>
  ) : (
    <span>{t.empty}</span>
  );

/**
 * The Brief de sortie on the piece (proto briefDoc): « Brief de sortie —
 * Vn », what stays to arbitrate (computed), « Voir le PDF », then Pour qui
 * et pourquoi · Comment (retained levers, deliverables) · Quand (each
 * milestone's day and J) · Objectif et budget (internal).
 */
export function BriefOutDoc({
  version,
  out,
  pdfHref,
  alerts = [],
}: {
  version: number;
  out: BriefOut;
  pdfHref: string | null;
  // Critical alerts of an older version, read before deciding.
  alerts?: string[];
}) {
  const row = (label: string, list: string[]) => (
    <InfoRow title={list.join(" · ") || t.empty} detail={label} />
  );
  return (
    <VersionCard
      title={t.title(version)}
      defaultOpen
      meta={
        <span className="flex flex-wrap items-center gap-3">
          <span className="text-caption text-[color:var(--text-secondary)]">
            {t.openPoints} :{" "}
            {out.openPoints.length ? out.openPoints.join(" · ") : t.none}
          </span>
          {pdfHref && (
            <a
              href={pdfHref}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              {t.pdf}
            </a>
          )}
        </span>
      }
    >
      {alerts.length > 0 && (
        <Block title={t.alerts}>
          <ul className="list-disc pl-5 text-body-sm">
            {alerts.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Block>
      )}
      <Block title={t.who}>
        <Rows label={t.who}>
          {row(t.positioning, out.positioning)}
          {row(t.audiences, out.audiences)}
          {row(t.narrative, out.narrative)}
        </Rows>
      </Block>
      <Block title={t.how}>
        <Rows label={t.how}>
          <li className="flex flex-col gap-1.5 px-3.5 py-3 text-body-sm">
            <span className="text-caption text-[color:var(--text-secondary)]">
              {t.levers}
            </span>
            <Chips list={out.levers} />
          </li>
          <li className="flex flex-col gap-1.5 px-3.5 py-3 text-body-sm">
            <span className="text-caption text-[color:var(--text-secondary)]">
              {t.deliverables}
            </span>
            <Chips list={out.deliverables} />
          </li>
        </Rows>
      </Block>
      <Block title={t.when}>
        <Rows label={t.when}>
          {out.when.length === 0 ? (
            <li className="px-3.5 py-3 text-body-sm">{t.empty}</li>
          ) : (
            out.when.map((w) => (
              <li
                key={`${w.day}-${w.name}`}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-3.5 py-3 text-body-sm"
              >
                <span className="min-w-[9.5rem] font-semibold tabular-nums">
                  {formatDay(w.day)}
                </span>
                <span className="min-w-0 flex-1">
                  {w.name}
                  {w.offset !== null && (
                    <span className="text-caption text-[color:var(--text-tertiary)]">
                      {" "}
                      · {dayLabel(w.offset)}
                    </span>
                  )}
                </span>
              </li>
            ))
          )}
        </Rows>
      </Block>
      <Block title={t.goal}>
        <StatTiles
          columns={3}
          stats={[
            {
              label: t.objective,
              value: out.objectives.join(" · ") || t.empty,
            },
            {
              label: t.budget,
              value: euros(out.budget.proposedCents),
              hint: t.budgetOf(
                out.budget.envelopeCents === null
                  ? null
                  : euros(out.budget.envelopeCents),
              ),
            },
          ]}
        />
      </Block>
    </VersionCard>
  );
}
