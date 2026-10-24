"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { ContractProofSlot } from "@/components/legal/clearance/contract-proof-slot";
import { SignatureGate } from "@/components/legal/signed-returns/signature-gate";
import { NextCard } from "@/components/ui/next-card";
import type { ContractProof } from "@/lib/contracts/proof";
import { fr } from "@/lib/i18n/fr";

/**
 * « Marquer comme signé » (proto « Projet complet »): the signed copy and
 * its proof dropped here, PDS's signature by the direction, then the
 * team's check and the contract marked signed (JUR-11) — refused, in red,
 * while a file is missing.
 */
export function ContractSign({
  contractId,
  organizationId,
  proof,
  pending,
  onSign,
  person,
  canCountersign,
  direction,
  onCountersign,
  extra,
}: {
  contractId: string;
  organizationId: string | null;
  proof: ContractProof | null;
  pending: boolean;
  onSign: () => void;
  // JUR-11: PDS signs, then the team checks.
  person: string;
  canCountersign: boolean;
  direction: string;
  onCountersign: () => void;
  extra?: React.ReactNode;
}) {
  const t = fr.legal.panels.contract;
  const f = fr.legalClearance.flow;
  const s = fr.legalClearance.stages.sign;
  const [tried, setTried] = useState(false);
  const missing = [
    ...(proof?.signed ? [] : [f.signedMissing]),
    ...(proof?.evidence ? [] : [f.evidenceMissing]),
  ];
  return (
    <NextCard kind="wait" label={t.waiting} title={t.deposit}>
      {organizationId && (
        <div className="grid gap-2 sm:grid-cols-2">
          <ContractProofSlot
            organizationId={organizationId}
            contractId={contractId}
            category="signed"
            label={s.signedSlot}
            hint={s.slotHint}
            present={proof?.signed ?? false}
            invalid={tried && !proof?.signed}
          />
          <ContractProofSlot
            organizationId={organizationId}
            contractId={contractId}
            category="evidence"
            label={s.evidenceSlot}
            hint={s.evidenceHint}
            present={proof?.evidence ?? false}
            invalid={tried && !proof?.evidence}
          />
        </div>
      )}
      {tried && missing.length > 0 && (
        <FormMessage kind="error">
          {f.filesMissing(missing.join(f.and))}
        </FormMessage>
      )}
      <SignatureGate
        person={person}
        countersign={proof?.countersign ?? null}
        canCountersign={canCountersign}
        direction={direction}
        pending={pending}
        onCountersign={onCountersign}
        onSign={onSign}
        ready={missing.length === 0}
        onBlocked={() => setTried(true)}
        extra={extra}
      />
    </NextCard>
  );
}
