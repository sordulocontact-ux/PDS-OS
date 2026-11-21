import type { ReactNode } from "react";

import { DealNowActions } from "@/components/deals/deal-now-actions";
import { NowFrame } from "@/components/shell/journey/now-card";
import { FactCard, FactCards } from "@/components/ui/fact-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatTermValue } from "@/lib/deals/term-format";
import type { DealTerm } from "@/lib/deals/terms";
import type { Deal } from "@/lib/deals/types";
import { deals } from "@/lib/i18n/fr/deals";
import { myValidationTone } from "@/lib/ui/state-tones";

const fr = { deals };

const secondary =
  "text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)] text-pretty";
const heading =
  "text-[length:var(--type-display-sm)] leading-[var(--type-display-sm-lh)] font-medium tracking-[var(--type-display-tracking)] text-balance";

/** The stage a deal moves to next, by its order. */
export const NEXT_STAGE: Partial<Record<Deal["stage"], Deal["stage"]>> = {
  to_contact: "call_planned",
  call_planned: "negotiation",
  negotiation: "agreement",
  agreement: "contracting",
  contracting: "signed",
};

/**
 * The stage the main button proposes, only when something happened that
 * makes it true (Ibé 18/11/2026: a button that only moved to the next
 * stage let a deal go from « À contacter » to « Signé » in a few clicks).
 * « À contacter »: the call is prepared (`lead`), never declared; the
 * negotiation: the accord once a term is confirmed; contracting: « Signé »
 * comes with the signed contract (20261120110101). A deal whose terms
 * already hold before its negotiation started goes straight to its accord
 * de principe — one gesture, not two (UX test of 12/11/2026).
 */
function nextStageOf(deal: Deal, terms: DealTerm[]): Deal["stage"] | null {
  const confirmed = terms.some((term) => term.state === "confirmed");
  const early = deal.stage === "to_contact" || deal.stage === "call_planned";
  if (early && confirmed) return "agreement";
  if (deal.stage === "to_contact" || deal.stage === "contracting") return null;
  if (deal.stage === "negotiation" && !confirmed) return null;
  return NEXT_STAGE[deal.stage] ?? null;
}

/** The confirmed terms, recalled above the direction's decision. */
function TermsRecap({ terms }: { terms: DealTerm[] }) {
  const t = fr.deals.page;
  const confirmed = terms.filter((term) => term.state === "confirmed");
  const others = terms.filter(
    (term) => term.state !== "confirmed" && term.state !== "to_define",
  ).length;
  if (confirmed.length === 0) return <p className={secondary}>{t.recapNone}</p>;
  return (
    <div className="flex flex-col gap-2">
      <FactCards>
        {confirmed.map((term) => (
          <FactCard
            key={term.key}
            label={fr.deals.terms.labels[term.key] ?? term.key}
            value={formatTermValue(term.format, term.value) ?? ""}
            text={term.format === "text" || term.format === "split"}
          />
        ))}
      </FactCards>
      {others > 0 && <p className={secondary}>{t.recapOthers(others)}</p>}
    </div>
  );
}

/**
 * « Maintenant » of a deal (BIZ 4), only when the reader has a gesture on
 * it: the direction decides a proposed accord de principe, its confirmed
 * terms recalled above; the negotiator moves his deal to its next stage
 * (or another, or abandons it) — or reads that the direction is warned.
 * An abandoned deal says it is final and what to do (`reopen`: « Ouvrir un
 * nouveau deal » for whoever may). Nothing for the project's owner, who
 * reads. `lead`: « Préparer un call », the gesture of a deal to contact.
 */
export function DealNow({
  deal,
  terms,
  proposer = null,
  reopen,
  lead,
  planCall,
  nextCall = null,
}: {
  deal: Deal;
  terms: DealTerm[];
  // Who proposed the accord (its last stage event), not whoever holds the
  // deal now: it may have changed hands since (UX test of 12/11/2026).
  proposer?: string | null;
  reopen?: ReactNode;
  lead?: ReactNode;
  // « Caler le call » of the project's owner (deal.canPlanCall), and the
  // next call already planned (its day and hour).
  planCall?: ReactNode;
  nextCall?: string | null;
}) {
  const t = fr.deals.page;
  if (deal.canDecide)
    return (
      <NowFrame label={t.now}>
        <div>
          <StatusBadge tone={myValidationTone}>{t.toValidate}</StatusBadge>
        </div>
        <h2 className={heading}>{t.approve}</h2>
        <p className={secondary}>
          {t.decideWhy(proposer ?? deal.assignee?.name ?? t.someone)}
        </p>
        <TermsRecap terms={terms} />
        <DealNowActions deal={deal} mode="decide" next={null} />
      </NowFrame>
    );
  if (deal.stage === "abandoned")
    return (
      <NowFrame label={t.now} quiet>
        <h2 className={heading}>{t.abandonedTitle}</h2>
        <p className={secondary}>{t.abandonedBody(deal.abandonReason)}</p>
        {reopen}
      </NowFrame>
    );
  // The project's owner calls the negotiation, never writes it (Ibé
  // 18/11/2026): her gesture until the accord. A call already planned is
  // said, without the button (Sacha 21/11/2026: « je l'ai déjà fait »); once
  // held, the button comes back for the next one.
  if (deal.canPlanCall && planCall)
    return nextCall ? (
      <NowFrame label={t.now} quiet>
        <h2 className={heading}>{t.planCall.planned(nextCall)}</h2>
      </NowFrame>
    ) : (
      <NowFrame label={t.now}>
        <h2 className={heading}>
          {t.planCall.title(deal.assignee?.name ?? null)}
        </h2>
        <div>{planCall}</div>
      </NowFrame>
    );
  if (!deal.canWrite) return null;
  if (deal.stage === "agreement" && deal.agreementStatus === "pending")
    return (
      <NowFrame label={t.now} quiet>
        <p className={secondary}>{t.waitDirection}</p>
        <DealNowActions deal={deal} mode="wait" next={null} />
      </NowFrame>
    );
  const next = nextStageOf(deal, terms);
  return (
    <NowFrame label={t.now}>
      <h2 className={heading}>
        {deal.nextAction ??
          (next ? t.advance[next] : fr.deals.work.todo[deal.stage])}
      </h2>
      <p className={secondary}>{t.why[deal.stage]}</p>
      <DealNowActions
        deal={deal}
        mode="move"
        next={next}
        lead={deal.stage === "to_contact" && !next ? lead : undefined}
      />
    </NowFrame>
  );
}
