"use client";

import type { ReactNode } from "react";

import { ContractReceived } from "@/components/legal/signed-returns/contract-received";
import { ContractSign } from "@/components/legal/tracking/contract-sign";
import { Fold } from "@/components/ui/fold";
import { ToneCallout } from "@/components/ui/tone-callout";
import type { ContractProof } from "@/lib/contracts/proof";
import { todayInParis } from "@/lib/contracts/types";
import { legal } from "@/lib/i18n/fr/legal";
import { signedReturns } from "@/lib/i18n/fr/signed-returns";

const fr = { legal, signedReturns };

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
  version,
  canCountersign,
  direction,
  onCountersign,
  personLink,
  extra,
}: {
  person: string;
  contractId: string;
  organizationId: string | null;
  proof: ContractProof | null;
  pending: boolean;
  onSign: (signedOn: string, checked?: boolean) => void;
  // JUR-11: the version signed, and PDS's signature by the direction.
  version: number | null;
  canCountersign: boolean;
  direction: string;
  onCountersign: () => void;
  personLink?: ReactNode;
  extra?: ReactNode;
}) {
  if (proof?.deposit)
    return (
      <ContractReceived
        contractId={contractId}
        organizationId={organizationId}
        proof={proof}
        person={person}
        deposit={proof.deposit}
        version={version}
        countersign={proof.countersign}
        canCountersign={canCountersign}
        direction={direction}
        pending={pending}
        onCountersign={onCountersign}
        onSign={onSign}
        extra={extra}
      />
    );
  // Who is awaited, in the Master's blue; how and when it was sent is in
  // « Déjà fait » (Sacha, 06/11/2026).
  return (
    <>
      <ToneCallout tone="info">{t.waiting(person)}</ToneCallout>
      {personLink}
      <Fold summary={t.otherwise}>
        <ContractSign
          contractId={contractId}
          organizationId={organizationId}
          proof={proof}
          pending={pending}
          onSign={() => onSign(todayInParis(new Date()), true)}
          person={person}
          canCountersign={canCountersign}
          direction={direction}
          onCountersign={onCountersign}
          extra={extra}
        />
      </Fold>
    </>
  );
}
