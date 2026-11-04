"use client";

import { IconMoneyBillCoin } from "nucleo-sharp-essential";
import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { DocumentCard } from "@/components/ui/document-card";
import { ReasonForm } from "@/components/ui/reason-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { budget } from "@/lib/i18n/fr/budget";
import { masterRound } from "@/lib/i18n/fr/master-round";
import { acceptRate, refuseRate } from "@/lib/master-workflow/round-actions";
import { budgetStatusTone } from "@/lib/ui/state-tones";
import type { RoundRate } from "@/lib/master-workflow/round-step";
import { formatShortDay, formatShortInstant } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";

const fr = { budget, masterRound };

const t = fr.masterRound.rate;

/**
 * « Tarif » (proto `master:v1`, Figma 378-6581): one document card per
 * rate the engineer proposed when taking the package — « Tarif · Mix ·
 * Karim Haddou » with its state, the amount, who proposed it and when;
 * for the owner « Accepter le tarif » or « Refuser » with why (Sacha,
 * 04/11). Refused: the amount and the reason, until the engineer proposes
 * another, which then says what it follows. Above the engineer's link.
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
  const [refusing, setRefusing] = useState<RoundRate["stage"] | null>(null);
  if (rates.length === 0) return null;
  return (
    <section className="flex flex-col gap-2" aria-label={t.title}>
      {rates.map((r) => {
        const refused = r.status === "planned" && r.refusal !== null;
        const before =
          r.status === "proposed" && r.refusal
            ? t.refusedBefore(formatAmount(r.refusal.cents), r.refusal.reason)
            : null;
        return (
          <DocumentCard
            key={r.stage}
            name={`${t.title} · ${t.line(r.stage, engineer)}`}
            line={
              refused
                ? t.awaiting(engineer)
                : r.status === "proposed"
                  ? t.note
                  : undefined
            }
            icon={IconMoneyBillCoin}
            action={
              refused ? (
                <StatusBadge tone="danger">{t.refusedState}</StatusBadge>
              ) : (
                <StatusBadge tone={budgetStatusTone[r.status] ?? "neutral"}>
                  {fr.budget.statuses[r.status]}
                </StatusBadge>
              )
            }
          >
            <div className="flex flex-col gap-3 p-3.5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <b className="text-[length:var(--type-body-lg)] leading-[var(--type-body-lg-lh)] font-semibold tabular-nums">
                    {formatAmount(refused ? r.refusal!.cents : r.amountCents)}
                  </b>
                  <span className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
                    {refused
                      ? t.refusedLine(
                          formatAmount(r.refusal!.cents),
                          formatShortDay(r.refusal!.at),
                          r.refusal!.reason,
                        )
                      : r.status === "proposed"
                        ? t.proposedBy(
                            engineer,
                            formatShortInstant(r.updatedAt),
                            r.estimateCents === r.amountCents,
                          )
                        : r.note}
                  </span>
                  {before && (
                    <span className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
                      {before}
                    </span>
                  )}
                </span>
                {canEdit && r.status === "proposed" && (
                  <span className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={submit.pending}
                      onClick={() => setRefusing(r.stage)}
                    >
                      {t.refuse}
                    </Button>
                    <Button
                      size="sm"
                      disabled={submit.pending}
                      onClick={() =>
                        submit.run(() => acceptRate(projectId, r.stage))
                      }
                    >
                      {t.accept}
                    </Button>
                  </span>
                )}
              </div>
              {refusing === r.stage && (
                <ReasonForm
                  label={t.refuseReason}
                  hint={t.refuseHint(engineer)}
                  submitLabel={t.refuse}
                  doneMessage={t.refused}
                  run={(reason) => refuseRate(projectId, r.stage, reason)}
                  onDone={() => setRefusing(null)}
                />
              )}
            </div>
          </DocumentCard>
        );
      })}
      <FormMessage kind="error">{submit.error}</FormMessage>
    </section>
  );
}
