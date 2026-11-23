"use client";

import { useState, type ReactNode } from "react";

import { FieldError, FormMessage } from "@/components/auth/form-message";
import { ContractProofSlot } from "@/components/legal/clearance/contract-proof-slot";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { DialogButton } from "@/components/ui/dialog-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { advanceContract } from "@/lib/contracts/actions";
import { contracts } from "@/lib/i18n/fr/contracts";
import { signedReturns } from "@/lib/i18n/fr/signed-returns";

const fr = { contracts, signedReturns };

const t = fr.contracts.now.countersign;

/**
 * « Signer pour PDS » (proto `countersign`): the copy signed by the party —
 * who signs first (Ibé, 07/11/2026) — then the direction's signature on that
 * PDF, dropped here (« pds_signed », the copy signed by both parties;
 * JUR-11, advance_contract 'countersign', 20261107200101).
 * When the direction may also mark it signed, it ticks that it checked the
 * signature (red at the first try) and the contract is concluded in the
 * same gesture — the day the signed copy came back.
 */
export function ContractCountersignDialog({
  contractId,
  organizationId,
  pdsSigned,
  person,
  document,
  canSign,
  signedOn,
}: {
  contractId: string;
  organizationId: string;
  // The PDF signed in turn for PDS is already dropped.
  pdsSigned: boolean;
  person: string;
  // The signed copy (name, « Voir le PDF »).
  document: ReactNode;
  // The viewer may also mark it signed (advance_contract 'sign').
  canSign: boolean;
  signedOn: string;
}) {
  return (
    <DialogButton
      label={t.button}
      variant="default"
      size="lg"
      title={t.title}
      description={t.body}
    >
      {(close) => (
        <CountersignForm
          contractId={contractId}
          organizationId={organizationId}
          pdsSigned={pdsSigned}
          person={person}
          document={document}
          canSign={canSign}
          signedOn={signedOn}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}

function CountersignForm({
  contractId,
  organizationId,
  pdsSigned,
  person,
  document,
  canSign,
  signedOn,
  onDone,
}: {
  contractId: string;
  organizationId: string;
  pdsSigned: boolean;
  person: string;
  document: ReactNode;
  canSign: boolean;
  signedOn: string;
  onDone: () => void;
}) {
  const team = fr.signedReturns.team;
  const [checked, setChecked] = useState(false);
  const [tried, setTried] = useState(false);
  const submit = useWriteSubmit(onDone, t.done);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (canSign && !checked) return;
        submit.run(
          async () => {
            const signed = await advanceContract({
              contractId,
              action: "countersign",
            });
            if (!signed.ok || !canSign) return signed;
            return advanceContract({
              contractId,
              action: "sign",
              signedOn,
              checked: true,
            });
          },
          canSign ? fr.contracts.now.done.sign : undefined,
        );
      }}
    >
      {document}
      <ContractProofSlot
        organizationId={organizationId}
        contractId={contractId}
        category="pds_signed"
        label={team.pdsFile}
        hint={team.pdsFileHint}
        present={pdsSigned}
      />
      {canSign && (
        <div className="flex flex-col gap-1">
          <CheckboxField
            label={team.checkBox(person)}
            checked={checked}
            onChange={setChecked}
          />
          {tried && !checked && (
            <FieldError id="countersign-check">{team.checkMissing}</FieldError>
          )}
        </div>
      )}
      <FormMessage kind="error">{submit.error}</FormMessage>
      <DialogFormActions
        pending={submit.pending}
        submitLabel={t.button}
        onCancel={onDone}
      />
    </form>
  );
}
