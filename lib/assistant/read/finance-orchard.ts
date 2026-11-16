import "server-only";

// PO's reading of The Orchard contract (Ibé, 16/11/2026: « le relier à PO
// qui sait quand les X sons sont atteints »): the contract, the advances
// received and due, the titles delivered (counted by the Distribution since
// the contract's start, plus those entered outside PDS OS) and the next
// advance. Every figure is computed by lib/finance/engines.ts, never by the
// model.

import { formatDay } from "@/lib/assistant/facts";
import {
  cash,
  FINANCE_MAX_LINES as MAX_LINES,
  parisToday,
} from "@/lib/assistant/read/finance-format";
import { readFailed, type ReadResult } from "@/lib/assistant/read/target";
import { routes } from "@/lib/auth/redirects";
import { loadEngines } from "@/lib/finance/engine-queries";
import { orchardAdvances } from "@/lib/finance/engines";
import { assistantReadFinance } from "@/lib/i18n/fr/assistant-read-finance";
import { fundings } from "@/lib/i18n/fr/fundings";
import { createClient } from "@/lib/supabase/server";

const fr = { assistantReadFinance, fundings };

export async function readOrchard(): Promise<ReadResult> {
  const t = fr.assistantReadFinance.orchard;
  const supabase = await createClient();
  const { engines, error } = await loadEngines(supabase);
  if (error) return readFailed();
  const today = parisToday();
  const o = orchardAdvances(engines, today);
  const { settings } = engines;
  const facts = [
    t.contract(
      cash(settings.orchardTrancheCents),
      o.per,
      o.contractCents === null ? null : cash(o.contractCents),
    ),
    t.received(
      o.received,
      cash(o.receivedCents),
      o.leftCents === null ? null : cash(o.leftCents),
    ),
  ];
  if (o.complete) facts.push(t.complete);
  else {
    facts.push(
      t.delivered(
        o.delivered,
        o.fromDistribution,
        settings.orchardCountsFrom
          ? formatDay(settings.orchardCountsFrom)
          : null,
        o.delivered - o.fromDistribution,
      ),
      t.toward(o.counted, o.per),
    );
    const due = o.advances.filter((a) => a.show === null);
    if (due.length)
      facts.push(
        t.due(due.length, cash(due.reduce((sum, a) => sum + a.cents, 0))),
      );
    const next = o.advances.find((a) => a.show !== null);
    facts.push(
      next?.show
        ? t.next(
            fr.fundings.orchard.trancheOf(next.n + 1, o.tranches),
            formatDay(next.day),
            cash(next.cents),
            next.show.label,
          )
        : t.noNext,
    );
  }
  const deliveries = [...engines.orchardDeliveries].reverse();
  if (deliveries.length)
    facts.push(
      t.deliveriesTitle(deliveries.length),
      ...deliveries
        .slice(0, MAX_LINES)
        .map((d) =>
          t.delivery(
            formatDay(d.day),
            fr.fundings.orchard.deliveries.row(d.project, d.release),
            d.titles,
          ),
        ),
    );
  return {
    facts,
    sources: [
      {
        label: fr.assistantReadFinance.sources.orchard,
        href: routes.financeFundings,
      },
    ],
  };
}
