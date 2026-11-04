"use client";

import { IconMoneyBillCoin } from "nucleo-sharp-essential";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { DocumentCard } from "@/components/ui/document-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { budget } from "@/lib/i18n/fr/budget";
import { masterRound } from "@/lib/i18n/fr/master-round";
import { acceptRate } from "@/lib/master-workflow/round-actions";
import { budgetStatusTone } from "@/lib/ui/state-tones";
import type { RoundRate } from "@/lib/master-workflow/round-step";
import { formatShortInstant } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";

const fr = { budget, masterRound };

const t = fr.masterRound.rate;

/**
 * « Tarif » (proto `master:v1`, Figma 378-6581): one document card per
 * rate the engineer proposed when taking the package — « Tarif · Mix ·
 * Karim Haddou » with its state, the amount, who proposed it and when, and
 * « Accepter le tarif » for the owner. Above the engineer's link.
 */
export function RateBlock({
  projectId,
  engineer,
  rates,
  canEdit,
}: {
  projectId: string;
  engineer: string;
  rates: RoundRate[];
  canEdit: boolean;
}) {
  const submit = useWriteSubmit(() => undefined, t.accepted);
  if (rates.length === 0) return null;
  return (
    <section className="flex flex-col gap-2" aria-label={t.title}>
      {rates.map((r) => (
        <DocumentCard
          key={r.stage}
          name={`${t.title} · ${t.line(r.stage, engineer)}`}
          line={r.status === "proposed" ? t.note : undefined}
          icon={IconMoneyBillCoin}
          action={
            <StatusBadge tone={budgetStatusTone[r.status] ?? "neutral"}>
              {fr.budget.statuses[r.status]}
            </StatusBadge>
          }
        >
          <div className="flex flex-wrap items-center gap-3 p-3.5">
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <b className="text-[length:var(--type-body-lg)] leading-[var(--type-body-lg-lh)] font-semibold tabular-nums">
                {formatAmount(r.amountCents)}
              </b>
              {(r.status === "proposed" || r.note) && (
                <span className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
                  {r.status === "proposed"
                    ? t.proposedBy(
                        engineer,
                        formatShortInstant(r.updatedAt),
                        r.estimateCents === r.amountCents,
                      )
                    : r.note}
                </span>
              )}
            </span>
            {canEdit && r.status === "proposed" && (
              <Button
                size="sm"
                disabled={submit.pending}
                onClick={() => submit.run(() => acceptRate(projectId, r.stage))}
              >
                {t.accept}
              </Button>
            )}
          </div>
        </DocumentCard>
      ))}
      <FormMessage kind="error">{submit.error}</FormMessage>
    </section>
  );
}
