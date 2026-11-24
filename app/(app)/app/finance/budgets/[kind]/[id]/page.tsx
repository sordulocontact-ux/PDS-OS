import { notFound } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import {
  AddEnvelopeSpendButton,
  EnvelopeMenu,
} from "@/components/finance/budget-actions";
import { BudgetParts } from "@/components/finance/budget-parts";
import { EnvelopeFigures } from "@/components/finance/envelope-figures";
import { FinanceFrame } from "@/components/finance/finance-frame";
import { PostPie } from "@/components/finance/post-pie";
import { PostsTable } from "@/components/finance/posts-table";
import { SpendsTable } from "@/components/finance/spends-table";
import { BackLink } from "@/components/shell/back-link";
import { EmptyNote } from "@/components/shell/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { SegmentedLinks } from "@/components/ui/segmented-control";
import { can } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { partNamesOf } from "@/lib/finance/budget-envelope";
import { loadBudgetParts } from "@/lib/finance/budget-envelope-queries";
import { loadBudgets } from "@/lib/finance/budget-queries";
import { kindOfSlug } from "@/lib/finance/envelope-slugs";
import {
  byPost,
  envelopeRow,
  linesOf,
  totalsOf,
} from "@/lib/finance/envelopes";
import {
  SPEND_STAGES,
  spendStage,
  type SpendStage,
} from "@/lib/finance/spends";
import { loadTreasury } from "@/lib/finance/treasury-queries";
import { financeBudgets as t } from "@/lib/i18n/fr/finance-budgets";
import { parisPlace } from "@/lib/utils/calendar-period";
import { formatShortDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: t.title };

const amount = (cents: number) => formatAmount(cents, { ht: false });
const day = (value: string) => formatShortDay(value, { bare: true });

// The URL's word for a status (`?statut=engage`), as the lists' `?vue=`.
const STAGE_SLUG = {
  planned: "prevu",
  committed: "engage",
  invoiced: "facture",
  paid: "paye",
} as const satisfies Record<SpendStage, string>;
const asStage = (value: unknown): SpendStage | null =>
  SPEND_STAGES.find((s) => STAGE_SLUG[s] === value) ?? null;

/**
 * One envelope (Ibé's ticket, maquette 3, lot 4): its budget (initial and
 * revisions), what is engaged and left, the gap to the forecast, the share
 * PDS finances; the split by poste, the posts and sub-posts, its revisions
 * and every line. The Finance revises a cost center, sets the PDS share,
 * keeps the lines as a template, imports lines where it writes them.
 */
export default async function FinanceEnvelopePage({
  params,
  searchParams,
}: PageProps<"/app/finance/budgets/[kind]/[id]">) {
  const today = parisPlace(new Date()).day;
  const [access, { kind: slug, id }, query, data, treasury, cut] =
    await allInOrder([
      requirePermission("read_finance"),
      params,
      searchParams,
      loadBudgets(),
      loadTreasury(today),
      // Its sub-budgets, read with the rest (one round trip).
      params.then((p) => {
        const k = kindOfSlug(p.kind);
        return k ? loadBudgetParts(k, p.id) : null;
      }),
    ]);
  const kind = kindOfSlug(slug);
  const envelope = data.envelopes.find((e) => e.kind === kind && e.id === id);
  if (!kind || !envelope || !cut) notFound();
  const { parts, partOf } = cut;
  const row = envelopeRow(envelope, data.spends);
  // The status filter (lot 4): the figures, the pie and the lines follow it;
  // what is left stays the envelope's, whole.
  const stage = asStage(query.statut);
  const all = linesOf(envelope, data.spends);
  const lines = all.filter((s) => !stage || spendStage(s.status) === stage);
  const posts = byPost(lines);
  const here = `${routes.financeBudgets}/${slug}/${id}`;
  const canManage = can(access, "manage_finance");
  // Who may write the envelope's lines: the Finance its cost centers, the
  // artists' budgets' readers an artist (a project's owner from its Budget).
  const canImport =
    (kind === "cost_center" && canManage) ||
    (kind === "artist" && can(access, "read_artist_budgets"));
  const share = envelope.pdsShareBp;

  return (
    <FinanceFrame
      section="budgets"
      title={envelope.name}
      above={<BackLink href={routes.financeBudgets}>{t.back}</BackLink>}
      action={
        <>
          {canImport && access.organizationId && (
            <AddEnvelopeSpendButton
              kind={kind}
              id={id}
              organizationId={access.organizationId}
            />
          )}
          <EnvelopeMenu
            kind={kind}
            id={id}
            name={envelope.name}
            currentCents={envelope.currentCents}
            shareBp={share}
            lines={all
              .filter((s) => !s.refused)
              .map((s) => ({
                label: s.label,
                family: s.family,
                subpost: s.subpost,
                cents: s.cents,
              }))}
            formats={data.formats}
            canManage={canManage}
            canImport={canImport}
          />
        </>
      }
    >
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
      {data.error && <FormMessage kind="error">{t.loadError}</FormMessage>}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <EnvelopeFigures row={row} totals={totalsOf(lines)} />
        <PostPie posts={posts} />
      </div>
      {envelope.revisions.length > 0 && (
        <div className="grid items-start gap-4">
          <MetricCard
            title={t.detail.revisions}
            count={envelope.revisions.length}
          >
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
          </MetricCard>
        </div>
      )}
      <BudgetParts
        kind={kind}
        id={id}
        budgetCents={envelope.currentCents}
        parts={parts}
        partOf={partOf}
        spends={all}
        canManage={canManage}
      />
      {all.length === 0 ? (
        <EmptyNote>{t.detail.noLines}</EmptyNote>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-body-lg font-medium">{t.detail.posts}</h3>
              <SegmentedLinks
                label={t.filter.label}
                options={[
                  {
                    key: "all",
                    href: here,
                    label: t.filter.all,
                    current: !stage,
                  },
                  ...SPEND_STAGES.map((s) => ({
                    key: s,
                    href: `${here}?statut=${STAGE_SLUG[s]}`,
                    label: t.filter[s],
                    current: stage === s,
                  })),
                ]}
              />
            </div>
            {lines.length > 0 && <PostsTable posts={posts} />}
          </section>
          {lines.length === 0 && <EmptyNote>{t.detail.noLines}</EmptyNote>}
          <SpendsTable
            hideEnvelope
            partNames={partNamesOf(parts, partOf)}
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
