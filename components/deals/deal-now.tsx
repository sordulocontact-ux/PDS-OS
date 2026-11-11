import { DealNowActions } from "@/components/deals/deal-now-actions";
import { NowFrame } from "@/components/shell/journey/now-card";
import { StatusBadge } from "@/components/ui/status-badge";
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
 * « Maintenant » of a deal (BIZ 4), only when the reader has a gesture on
 * it: the direction decides a proposed accord de principe; the negotiator
 * moves his deal to its next stage (or another, or abandons it) — or reads
 * that the direction is awaited. Nothing for the project's owner, who
 * reads.
 */
export function DealNow({ deal }: { deal: Deal }) {
  const t = fr.deals.page;
  if (deal.canDecide)
    return (
      <NowFrame label={t.now}>
        <div>
          <StatusBadge tone={myValidationTone}>{t.toValidate}</StatusBadge>
        </div>
        <h2 className={heading}>{t.approve}</h2>
        <p className={secondary}>
          {t.decideWhy(deal.assignee?.name ?? t.someone)}
        </p>
        <DealNowActions deal={deal} mode="decide" next={null} />
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
  const next = NEXT_STAGE[deal.stage] ?? null;
  return (
    <NowFrame label={t.now}>
      <h2 className={heading}>
        {deal.nextAction ?? (next ? t.advance[next] : t.why[deal.stage])}
      </h2>
      <p className={secondary}>{t.why[deal.stage]}</p>
      <DealNowActions deal={deal} mode="move" next={next} />
    </NowFrame>
  );
}
