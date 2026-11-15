import { notFound } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { EnvelopeActions } from "@/components/finance/budget-actions";
import { FinanceFrame } from "@/components/finance/finance-frame";
import { PostPie } from "@/components/finance/post-pie";
import { PostsTable } from "@/components/finance/posts-table";
import { SpendsTable } from "@/components/finance/spends-table";
import { BackLink } from "@/components/shell/back-link";
import { EmptyNote } from "@/components/shell/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { can } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { loadBudgets } from "@/lib/finance/budget-queries";
import { kindOfSlug } from "@/lib/finance/envelope-slugs";
import { byPost, envelopeRow, linesOf } from "@/lib/finance/envelopes";
import { loadTreasury } from "@/lib/finance/treasury-queries";
import { financeBudgets as t } from "@/lib/i18n/fr/finance-budgets";
import { parisPlace } from "@/lib/utils/calendar-period";
import { formatShortDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: t.title };

const amount = (cents: number) => formatAmount(cents, { ht: false });
const day = (value: string) => formatShortDay(value, { bare: true });

/**
 * One envelope (Ibé's ticket, maquette 3, lot 4): its budget (initial and
 * revisions), what is engaged and left, the gap to the forecast, the share
 * PDS finances; the split by poste, the posts and sub-posts, its revisions
 * and every line. The Finance revises a cost center, sets the PDS share,
 * keeps the lines as a template, imports lines where it writes them.
 */
export default async function FinanceEnvelopePage({
  params,
}: PageProps<"/app/finance/budgets/[kind]/[id]">) {
  const today = parisPlace(new Date()).day;
  const [access, { kind: slug, id }, data, treasury] = await allInOrder([
    requirePermission("read_finance"),
    params,
    loadBudgets(),
    loadTreasury(today),
  ]);
  const kind = kindOfSlug(slug);
  const envelope = data.envelopes.find((e) => e.kind === kind && e.id === id);
  if (!kind || !envelope) notFound();
  const row = envelopeRow(envelope, data.spends);
  const lines = linesOf(envelope, data.spends);
  const posts = byPost(lines);
  const canManage = can(access, "manage_finance");
  // Who may write the envelope's lines: the Finance its cost centers, the
  // artists' budgets' readers an artist (a project's owner from its Budget).
  const canImport =
    (kind === "cost_center" && canManage) ||
    (kind === "artist" && can(access, "read_artist_budgets"));
  const share = envelope.pdsShareBp;

  return (
    <FinanceFrame section="budgets" title={envelope.name}>
      <div className="flex flex-col gap-4">
        <BackLink href={routes.financeBudgets}>{t.back}</BackLink>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <p className="text-body-md text-[color:var(--text-secondary)]">
            {[
              t.kindOne[kind],
              envelope.period &&
                t.detail.period(
                  day(envelope.period.startsOn),
                  envelope.period.endsOn ? day(envelope.period.endsOn) : null,
                ),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <EnvelopeActions
            kind={kind}
            id={id}
            name={envelope.name}
            currentCents={envelope.currentCents}
            shareBp={share}
            lines={lines
              .filter((s) => !s.refused)
              .map((s) => ({
                label: s.label,
                family: s.family,
                subpost: s.subpost,
                cents: s.cents,
              }))}
            canManage={canManage}
            canImport={canImport}
          />
        </div>
      </div>
      {data.error && <FormMessage kind="error">{t.loadError}</FormMessage>}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          title={t.columns.budget}
          value={
            row.currentCents === null ? t.noBudget : amount(row.currentCents)
          }
          caption={
            row.initialCents !== null && row.revisionsCents !== 0
              ? `${t.initial(amount(row.initialCents))} · ${t.signed(
                  amount(Math.abs(row.revisionsCents)),
                  row.revisionsCents > 0,
                )}`
              : undefined
          }
        />
        <MetricCard
          title={t.tiles.engaged}
          value={amount(row.engagedCents)}
          caption={t.tiles.engagedHint(
            amount(row.totals.invoicedCents),
            amount(row.totals.paidCents),
          )}
        />
        <MetricCard
          title={t.tiles.rest}
          value={row.restCents === null ? "—" : amount(row.restCents)}
          caption={t.tiles.restHint(amount(row.totals.plannedCents))}
          danger={(row.restCents ?? 0) < 0}
        />
        {share < 10000 ? (
          <MetricCard
            title={t.tiles.pdsPart}
            value={amount(row.pdsPartCents)}
            caption={t.tiles.pdsPartHint(share / 100)}
          />
        ) : (
          <MetricCard
            title={t.tiles.gap}
            value={t.signed(amount(Math.abs(row.gapCents)), row.gapCents >= 0)}
            caption={t.tiles.gapHint(amount(row.totals.forecastCents))}
          />
        )}
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <PostPie posts={posts} />
        <MetricCard
          title={t.detail.revisions}
          count={envelope.revisions.length}
        >
          {envelope.revisions.length === 0 ? (
            <p className="text-body-md text-[color:var(--text-secondary)]">
              {t.detail.noRevision}
            </p>
          ) : (
            <ul className="-my-2 divide-y divide-[var(--border-hairline)]">
              {envelope.revisions.map((r) => (
                <li key={r.at} className="grid gap-0.5 py-2">
                  <span className="text-body-md font-medium tabular-nums">
                    {t.detail.revision(
                      r.beforeCents === null
                        ? t.noBudget
                        : amount(r.beforeCents),
                      r.afterCents === null ? t.noBudget : amount(r.afterCents),
                    )}
                  </span>
                  <span className="text-caption text-[color:var(--text-secondary)]">
                    {[day(r.at.slice(0, 10)), r.reason]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </MetricCard>
      </div>
      {lines.length === 0 ? (
        <EmptyNote>{t.detail.noLines}</EmptyNote>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h3 className="text-body-lg font-medium">{t.detail.posts}</h3>
            <PostsTable posts={posts} />
          </section>
          <SpendsTable
            spends={lines}
            targets={treasury.targets}
            canManage={canManage}
            organizationId={access.organizationId ?? ""}
            ownerId={access.personId}
          />
        </>
      )}
    </FinanceFrame>
  );
}
