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
 * PDS signs after the person (Ibé, 07/11/2026): once their signed copy is
 * back, the direction signs that PDF in turn for PDS with its usual tool,
 * drops it here (« pds_signed », the copy signed by both parties), then
 * « Signer le contrat pour PDS ». Anyone else waits, said in the Master's
 * blue. The database refuses the countersignature without it
 * (20261107200101).
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
  person,
  extra,
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
  // Whose signed copy PDS signs in turn.
  person: string;
  // Another way out beside the gesture (« Je l'ai remis autrement »…).
  extra?: React.ReactNode;
}) {
  if (!canSign)
    return (
      <div className="flex flex-col gap-3">
        <ToneCallout tone="info">
          {t.awaitingCountersign(direction)}
        </ToneCallout>
        {extra && <div className="flex flex-wrap gap-2">{extra}</div>}
      </div>
    );
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
        {t.countersignBody(person)}
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
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={onSign}
        >
          {pending ? t.countersigning : t.countersign}
        </Button>
        {extra}
      </div>
    </div>
  );
}
