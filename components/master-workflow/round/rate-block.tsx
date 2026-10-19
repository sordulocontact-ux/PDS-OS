"use client";

import { Button } from "@/components/ui/button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import { acceptRate } from "@/lib/master-workflow/round-actions";
import type { RoundRate } from "@/lib/master-workflow/round-step";
import { formatShortInstant } from "@/lib/utils/day";

const t = fr.masterRound.rate;
const euros = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

/** « Tarif » (proto `master:v1`): the rate the engineer proposed when
 * taking the package, « Accepter le tarif » for the owner. */
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
    <section className="flex flex-col gap-2.5">
      <h3 className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold">
        {t.title}
      </h3>
      <FactRows>
        {rates.map((r) => (
          <FactRow
            key={r.stage}
            label={t.line(r.stage, engineer)}
            value={t.euros(euros.format(r.amountCents / 100))}
            source={
              r.status === "proposed"
                ? t.proposedBy(
                    engineer,
                    formatShortInstant(r.updatedAt),
                    r.estimateCents === r.amountCents,
                  )
                : r.note
            }
            state={{
              tone: r.status === "proposed" ? "info" : "success",
              label: r.status === "proposed" ? t.proposed : t.committed,
            }}
            side={
              canEdit &&
              r.status === "proposed" && (
                <Button
                  size="sm"
                  disabled={submit.pending}
                  onClick={() =>
                    submit.run(() => acceptRate(projectId, r.stage))
                  }
                >
                  {t.accept}
                </Button>
              )
            }
          />
        ))}
      </FactRows>
      {rates.some((r) => r.status === "proposed") && (
        <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
          {t.note}
        </p>
      )}
      {submit.error && (
        <p role="alert" className="text-sm text-error">
          {submit.error}
        </p>
      )}
    </section>
  );
}
