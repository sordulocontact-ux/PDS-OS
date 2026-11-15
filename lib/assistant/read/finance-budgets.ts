import "server-only";

// PO's reading of Finance's envelopes and missing proofs (lot 7,
// docs/FINANCE-V2.md), as Finance › Budgets and Dépenses compute them.

import { formatDay } from "@/lib/assistant/facts";
import { findNamed } from "@/lib/assistant/propose/match";
import {
  cash,
  FINANCE_MAX_LINES as MAX_LINES,
  ht,
} from "@/lib/assistant/read/finance-format";
import {
  capped,
  readFailed,
  type ReadResult,
} from "@/lib/assistant/read/target";
import { routes } from "@/lib/auth/redirects";
import { loadBudgets } from "@/lib/finance/budget-queries";
import { ENVELOPE_SLUG } from "@/lib/finance/envelope-slugs";
import { envelopeRow } from "@/lib/finance/envelopes";
import { loadSpends } from "@/lib/finance/spend-queries";
import { spendStage, spendTtc } from "@/lib/finance/spends";
import { assistantReadFinance } from "@/lib/i18n/fr/assistant-read-finance";

const fr = { assistantReadFinance };

export async function readBudgets(
  name: string | undefined,
): Promise<ReadResult> {
  const t = fr.assistantReadFinance.budgets;
  const data = await loadBudgets();
  if (data.error) return readFailed();
  const rows = data.envelopes
    .filter((e) => !e.archived)
    .map((e) => envelopeRow(e, data.spends));
  const percent = (engaged: number, of: number) =>
    of > 0 ? Math.round((engaged / of) * 100) : 0;
  const hrefOf = (row: (typeof rows)[number]) =>
    routes.financeBudget(ENVELOPE_SLUG[row.kind], row.id);

  if (name?.trim()) {
    const notes: string[] = [];
    const row = findNamed(rows, name, (r) => r.name, notes);
    if (!row)
      return {
        facts: [t.notFound(name.trim())],
        sources: [
          {
            label: fr.assistantReadFinance.sources.budgets,
            href: routes.financeBudgets,
          },
        ],
        gap: "missing",
      };
    const kind = t.kinds[row.kind];
    const source = { label: `${row.name} · Budget`, href: hrefOf(row) };
    if (row.currentCents === null)
      return {
        facts: [...notes, t.noAmount(row.name, kind)],
        sources: [source],
      };
    const rest = row.restCents ?? 0;
    return {
      facts: [
        ...notes,
        t.envelope(row.name, kind, ht(row.currentCents)),
        ...(row.period
          ? [
              t.period(
                formatDay(row.period.startsOn),
                row.period.endsOn ? formatDay(row.period.endsOn) : null,
              ),
            ]
          : []),
        t.engaged(
          ht(row.engagedCents),
          percent(row.engagedCents, row.currentCents),
          ht(row.totals.committedCents),
          ht(row.totals.invoicedCents),
          ht(row.totals.paidCents),
        ),
        t.planned(ht(row.totals.plannedCents)),
        rest < 0 ? t.overrun(ht(-rest)) : t.rest(ht(rest)),
        `${t.lines(row.totals.lines)}.`,
      ],
      sources: [source],
    };
  }

  const live = rows
    .filter((r) => r.currentCents !== null && r.currentCents > 0)
    .sort(
      (a, b) =>
        b.engagedCents / (b.currentCents ?? 1) -
        a.engagedCents / (a.currentCents ?? 1),
    );
  if (live.length === 0)
    return {
      facts: [t.none],
      sources: [
        {
          label: fr.assistantReadFinance.sources.budgets,
          href: routes.financeBudgets,
        },
      ],
    };
  const available = live.reduce(
    (sum, r) => sum + Math.max(r.restCents ?? 0, 0),
    0,
  );
  return {
    facts: [
      t.listTitle(live.length, ht(available)),
      ...live.slice(0, MAX_LINES).map((r) => {
        const rest = r.restCents ?? 0;
        return t.listLine(
          r.name,
          t.kinds[r.kind],
          ht(r.engagedCents),
          ht(r.currentCents ?? 0),
          percent(r.engagedCents, r.currentCents ?? 0),
          rest < 0 ? t.listOverrun(ht(-rest)) : t.listRest(ht(rest)),
        );
      }),
      ...capped(live.length, MAX_LINES),
      t.ht,
    ],
    sources: [
      {
        label: fr.assistantReadFinance.sources.budgets,
        href: routes.financeBudgets,
      },
    ],
  };
}

export async function readNoProof(): Promise<ReadResult> {
  const t = fr.assistantReadFinance.noProof;
  const { spends, error } = await loadSpends();
  if (error) return readFailed();
  // As the card « Justificatifs »: invoiced or paid, no proof.
  const missing = spends
    .filter((s) => !s.refused && !s.hasProof)
    .filter((s) => ["invoiced", "paid"].includes(spendStage(s.status)))
    .sort((a, b) => b.spentOn.localeCompare(a.spentOn));
  return {
    facts: [
      t.total(missing.length),
      ...missing
        .slice(0, MAX_LINES)
        .map((s) =>
          t.line(
            s.label,
            s.supplier ? t.supplier(s.supplier) : "",
            cash(spendTtc(s)),
            formatDay(s.spentOn),
          ),
        ),
      ...capped(missing.length, MAX_LINES),
    ],
    sources: [
      {
        label: fr.assistantReadFinance.sources.noProof,
        href: `${routes.financeSpends}?vue=sans-justificatif`,
      },
    ],
  };
}
