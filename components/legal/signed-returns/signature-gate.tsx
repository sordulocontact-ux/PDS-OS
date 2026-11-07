"use client";

import { useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import { PdsSignStep } from "@/components/legal/signed-returns/pds-sign-step";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import type { ContractProof } from "@/lib/contracts/proof";
import { legal } from "@/lib/i18n/fr/legal";
import { signedReturns } from "@/lib/i18n/fr/signed-returns";

const fr = { legal, signedReturns };

const t = fr.signedReturns.team;

/**
 * The last gestures of a contract's signature (JUR-11): the person signed
 * first; while PDS has not, the direction signs their PDF in turn for PDS
 * and drops it here (`PdsSignStep`), or the team waits for it; then the team ticks that it checked the
 * signature and marks the contract signed. `ready`: what else must be there
 * first (the signed copy and its proof when it came otherwise); `onBlocked`
 * says it. A confirmation in PDS OS is never a signature.
 */
export function SignatureGate({
  contractId,
  organizationId,
  proof,
  person,
  countersign,
  canCountersign,
  direction,
  pending,
  onCountersign,
  onSign,
  ready = true,
  onBlocked,
  extra,
}: {
  contractId: string;
  organizationId: string | null;
  proof: ContractProof | null;
  person: string;
  countersign: ContractProof["countersign"];
  canCountersign: boolean;
  direction: string;
  pending: boolean;
  onCountersign: () => void;
  onSign: () => void;
  ready?: boolean;
  onBlocked?: () => void;
  extra?: React.ReactNode;
}) {
  const [checked, setChecked] = useState(false);
  const [tried, setTried] = useState(false);
  if (!countersign)
    return (
      <PdsSignStep
        contractId={contractId}
        organizationId={organizationId}
        proof={proof}
        canSign={canCountersign}
        direction={direction}
        person={person}
        pending={pending}
        onSign={onCountersign}
        extra={extra}
      />
    );
  const sign = () => {
    setTried(true);
    if (!ready) return onBlocked?.();
    if (checked) onSign();
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <CheckboxField
          label={t.checkBox(person)}
          checked={checked}
          onChange={setChecked}
        />
        {tried && !checked && (
          <FieldError id="signature-check">{t.checkMissing}</FieldError>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} onClick={sign}>
          {fr.legal.panels.contract.markSigned}
        </Button>
        {extra}
      </div>
    </div>
  );
}
