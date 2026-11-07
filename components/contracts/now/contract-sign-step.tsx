"use client";

import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { Field } from "@/components/auth/field";
import { usePublishResult } from "@/components/shell/module/result-banner";
import { Button } from "@/components/ui/button";
import { ContractSign } from "@/components/legal/tracking/contract-sign";
import { SignatureGate } from "@/components/legal/signed-returns/signature-gate";
import { advanceContract } from "@/lib/contracts/actions";
import type { ContractProof } from "@/lib/contracts/proof";
import { todayInParis } from "@/lib/contracts/types";
import { contracts } from "@/lib/i18n/fr/contracts";

const fr = { contracts };

const t = fr.contracts.now;

/**
 * The end of a contract's signature. Generated from a template (JUR-11):
 * « gate » = the team checks the signature and marks it signed once PDS
 * signed; « otherwise » = the signed copy and its proof dropped here when
 * it came back outside the person's link (`ContractSign`). Written by hand:
 * the day it was signed, then « Enregistrer la signature ».
 */
export function ContractSignStep({
  contractId,
  mode,
  generated,
  person,
  organizationId,
  proof,
  canCountersign,
  direction,
  signedOn,
}: {
  contractId: string;
  mode: "gate" | "otherwise";
  generated: boolean;
  person: string;
  organizationId: string | null;
  proof: ContractProof | null;
  canCountersign: boolean;
  direction: string;
  // The day it came back: the signature's date for a generated contract.
  signedOn: string;
}) {
  const [pending, startTransition] = useTransition();
  const publish = usePublishResult();
  const advance = (
    action: "sign" | "countersign",
    extra?: { signedOn?: string; checked?: boolean },
  ) =>
    startTransition(async () => {
      const result = await advanceContract({ contractId, action, ...extra });
      if (!result.ok) return void toast.error(result.error);
      publish(result, t.done[action]);
    });

  if (!generated)
    return (
      <SignDateForm
        pending={pending}
        onSign={(day) => advance("sign", { signedOn: day })}
      />
    );
  if (mode === "otherwise")
    return (
      <ContractSign
        contractId={contractId}
        organizationId={organizationId}
        proof={proof}
        pending={pending}
        onSign={() => advance("sign", { signedOn, checked: true })}
        person={person}
        canCountersign={canCountersign}
        direction={direction}
        onCountersign={() => advance("countersign")}
      />
    );
  return (
    <SignatureGate
      contractId={contractId}
      organizationId={organizationId}
      proof={proof}
      person={person}
      countersign={proof?.countersign ?? null}
      canCountersign={canCountersign}
      direction={direction}
      pending={pending}
      onCountersign={() => advance("countersign")}
      onSign={() => advance("sign", { signedOn, checked: true })}
    />
  );
}

/** « Date de signature » then « Enregistrer la signature »: today or
 * before, said in red at the first try. */
function SignDateForm({
  pending,
  onSign,
}: {
  pending: boolean;
  onSign: (signedOn: string) => void;
}) {
  const today = todayInParis(new Date());
  const [day, setDay] = useState(today);
  const [tried, setTried] = useState(false);
  const invalid = !day || day > today;
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field
        name="signedOn"
        type="date"
        label={t.signedOnLabel}
        required
        hint={t.signedOnHint}
        max={today}
        value={day}
        error={tried && invalid ? t.signedOnMissing : undefined}
        onChange={(event) => setDay(event.target.value)}
        className="h-10 w-fit"
      />
      <Button
        disabled={pending}
        onClick={() => {
          setTried(true);
          if (!invalid) onSign(day);
        }}
      >
        {t.sign}
      </Button>
    </div>
  );
}
