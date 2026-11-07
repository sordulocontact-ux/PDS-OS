"use client";

import { ContractProofSlot } from "@/components/legal/clearance/contract-proof-slot";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import type { ContractProof } from "@/lib/contracts/proof";
import { signedReturns } from "@/lib/i18n/fr/signed-returns";

const fr = { signedReturns };

const t = fr.signedReturns.team;

/**
 * PDS signs first (Sacha, 06/11/2026): before a validated contract is sent,
 * the direction signs its PDF for PDS with its usual tool and drops it here
 * (« pds_signed »), then « Signer le contrat pour PDS ». That PDF is the one
 * the person downloads from their page, signs and sends back. Anyone else
 * waits, said in the Master's blue. The database refuses the sending
 * without it (20261107150101).
 */
export function PdsSignStep({
  contractId,
  organizationId,
  proof,
  canSign,
  direction,
  pending,
  error,
  onSign,
}: {
  contractId: string;
  organizationId: string | null;
  proof: ContractProof | null;
  // The direction (permission `validate`).
  canSign: boolean;
  // « Claire Morel », else « la direction ».
  direction: string;
  pending: boolean;
  error?: string | null;
  onSign: () => void;
}) {
  if (!canSign)
    return (
      <ToneCallout tone="info">{t.awaitingCountersign(direction)}</ToneCallout>
    );
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
        {t.countersignBody}
      </p>
      {organizationId && (
        <ContractProofSlot
          organizationId={organizationId}
          contractId={contractId}
          category="pds_signed"
          label={t.pdsFile}
          hint={t.pdsFileHint}
          present={Boolean(proof?.pdsSigned)}
        />
      )}
      <FormMessage kind="error">{error ?? null}</FormMessage>
      <Button
        className="self-start"
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={onSign}
      >
        {pending ? t.countersigning : t.countersign}
      </Button>
    </div>
  );
}
