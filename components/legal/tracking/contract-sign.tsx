"use client";

import { ContractProofSlot } from "@/components/legal/clearance/contract-proof-slot";
import { SignatureGate } from "@/components/legal/signed-returns/signature-gate";
import type { ContractProof } from "@/lib/contracts/proof";
import { legal } from "@/lib/i18n/fr/legal";
import { legalClearance } from "@/lib/i18n/fr/legal-clearance";

const fr = { legal, legalClearance };

/**
 * « Marquer comme signé » (proto « Projet complet »): the signed copy and
 * its proof dropped here, PDS's signature by the direction, then the
 * team's check and the contract marked signed (JUR-11), shown once both
 * files are here.
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
  const f = fr.legalClearance.flow;
  const s = fr.legalClearance.stages.sign;
  const missing = [
    ...(proof?.signed ? [] : [f.signedMissing]),
    ...(proof?.evidence ? [] : [f.evidenceMissing]),
  ];
  return (
    // Under « Le signé vous est parvenu autrement ? », which names it: no
    // card of its own.
    <div className="flex flex-col gap-3">
      {organizationId && (
        <div className="grid gap-2 sm:grid-cols-2">
          <ContractProofSlot
            organizationId={organizationId}
            contractId={contractId}
            category="signed"
            label={s.signedSlot}
            hint={s.slotHint}
            present={proof?.signed ?? false}
          />
          <ContractProofSlot
            organizationId={organizationId}
            contractId={contractId}
            category="evidence"
            label={s.evidenceSlot}
            hint={s.evidenceHint}
            present={proof?.evidence ?? false}
          />
        </div>
      )}
      {/* What comes next (PDS signs, the team checks) only once the
          signed copy and its proof are here: before, the card still waits
          for the person (Sacha 22/11/2026: « contradictoire »). */}
      {missing.length === 0 ? (
        <SignatureGate
          contractId={contractId}
          organizationId={organizationId}
          proof={proof}
          person={person}
          countersign={proof?.countersign ?? null}
          canCountersign={canCountersign}
          direction={direction}
          pending={pending}
          onCountersign={onCountersign}
          onSign={onSign}
          extra={extra}
        />
      ) : (
        extra && <div className="flex flex-wrap gap-2">{extra}</div>
      )}
    </div>
  );
}
