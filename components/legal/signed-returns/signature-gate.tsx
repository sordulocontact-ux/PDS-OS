"use client";

import { useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import type { ContractProof } from "@/lib/contracts/proof";
import { legal } from "@/lib/i18n/fr/legal";
import { signedReturns } from "@/lib/i18n/fr/signed-returns";

const fr = { legal, signedReturns };

const t = fr.signedReturns.team;

/**
 * The last gestures of a contract's signature (JUR-11): while PDS has not
 * signed, the direction signs for PDS here (« Signer le contrat pour PDS »)
 * or the team waits for it; then the team ticks that it checked the
 * signature and marks the contract signed. `ready`: what else must be there
 * first (the signed copy and its proof when it came otherwise); `onBlocked`
 * says it. A confirmation in PDS OS is never a signature.
 */
export function SignatureGate({
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
    return canCountersign ? (
      <div className="flex flex-col gap-2">
        <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
          {t.countersignBody}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={onCountersign}
          >
            {pending ? t.countersigning : t.countersign}
          </Button>
          {extra}
        </div>
      </div>
    ) : (
      <div className="flex flex-col gap-2">
        <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
          {t.awaitingCountersign(direction)}
        </p>
        {extra && <div className="flex flex-wrap gap-2">{extra}</div>}
      </div>
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
