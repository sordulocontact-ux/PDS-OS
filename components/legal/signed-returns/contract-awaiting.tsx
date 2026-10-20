"use client";

import type { ReactNode } from "react";

import { ContractReceived } from "@/components/legal/signed-returns/contract-received";
import { ContractSign } from "@/components/legal/tracking/contract-sign";
import { Fold } from "@/components/ui/fold";
import { NextCard } from "@/components/ui/next-card";
import type { ContractProof } from "@/lib/contracts/proof";
import { todayInParis } from "@/lib/contracts/types";
import { fr } from "@/lib/i18n/fr";
import { formatShortDay } from "@/lib/utils/day";

const t = fr.signedReturns.team;

/**
 * « Marquer comme signé » (proto « Projet complet », E6 step 7): while the
 * person has not deposited it, « En attente de … (lien privé) » with how it
 * was sent and their link, the signed copy « parvenu autrement » folded
 * (file and proof); once deposited by their link, « Reçu de … ».
 */
export function ContractAwaiting({
  person,
  contractId,
  organizationId,
  proof,
  pending,
  onSign,
  personLink,
  extra,
}: {
  person: string;
  contractId: string;
  organizationId: string | null;
  proof: ContractProof | null;
  pending: boolean;
  onSign: (signedOn: string) => void;
  personLink?: ReactNode;
  extra?: ReactNode;
}) {
  if (proof?.deposit)
    return (
      <ContractReceived
        person={person}
        deposit={proof.deposit}
        pending={pending}
        onSign={onSign}
        extra={extra}
      />
    );
  const sent = proof?.sent;
  const on = sent ? formatShortDay(sent.on, { bare: true }) : "";
  return (
    <>
      <NextCard
        kind="wait"
        label={fr.legal.panels.contract.waiting}
        title={t.waiting(person)}
      >
        {sent && (
          <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
            {sent.via === "other" && sent.how
              ? t.sentOther(sent.how, on)
              : t.sentLink(on)}
          </p>
        )}
      </NextCard>
      {personLink}
      <Fold summary={t.otherwise}>
        <ContractSign
          contractId={contractId}
          organizationId={organizationId}
          proof={proof}
          pending={pending}
          onSign={() => onSign(todayInParis(new Date()))}
          extra={extra}
        />
      </Fold>
    </>
  );
}
