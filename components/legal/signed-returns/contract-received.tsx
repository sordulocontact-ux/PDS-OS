"use client";

import { Button } from "@/components/ui/button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import type { ContractProof } from "@/lib/contracts/proof";
import { todayInParis } from "@/lib/contracts/types";
import { fr } from "@/lib/i18n/fr";
import { formatShortDay } from "@/lib/utils/day";

const t = fr.signedReturns.team;

/**
 * « Reçu de … par son lien privé » (proto « Projet complet », E6 step 7):
 * the signed copy the person deposited, « Voir le PDF », its proof (the
 * deposit, timestamped), then « Marquer comme signé » once checked — dated
 * the day of the deposit.
 */
export function ContractReceived({
  person,
  deposit,
  pending,
  onSign,
  extra,
}: {
  person: string;
  deposit: NonNullable<ContractProof["deposit"]>;
  pending: boolean;
  onSign: (signedOn: string) => void;
  extra?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-semibold">{t.received(person)}</h3>
      <FactRows>
        <FactRow
          label={t.signedFile}
          value={<b className="font-semibold break-all">{deposit.fileName}</b>}
          source={t.depositedBy(
            person,
            formatShortDay(deposit.at, { bare: true }),
          )}
          side={
            deposit.url && (
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={
                  <a href={deposit.url} target="_blank" rel="noreferrer" />
                }
              >
                {t.viewPdf}
              </Button>
            )
          }
        />
        <FactRow label={t.proof} value={t.proofValue} source={t.proofSource} />
      </FactRows>
      <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
        {t.verify}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={pending}
          onClick={() => onSign(todayInParis(new Date(deposit.at)))}
        >
          {fr.legal.panels.contract.markSigned}
        </Button>
        {extra}
      </div>
    </section>
  );
}
