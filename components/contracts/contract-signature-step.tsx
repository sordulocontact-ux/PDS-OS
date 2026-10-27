"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import type { ContractRights } from "@/lib/contracts/types";
import { contracts } from "@/lib/i18n/fr/contracts";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";

const fr = { contracts, legalContracts };

/**
 * Sending and signing a contract. A contract generated from a template
 * (Juridique 03) is « jamais considéré comme envoyé ou signé sans preuve »:
 * sending says how, signing waits for the signed copy and its proof in the
 * files (checked again by advance_contract).
 */
export function ContractSignatureStep({
  can,
  today,
  pending,
  proof,
  onSend,
  onSign,
}: {
  can: Pick<ContractRights, "send" | "sign">;
  today: string;
  pending: boolean;
  // Present for a generated contract.
  proof: { missing: boolean } | null;
  onSend: (comment: string) => void;
  onSign: (signedOn: string) => void;
}) {
  const t = fr.contracts.flow;
  const d = fr.legalContracts.document;
  const [signedOn, setSignedOn] = useState(today);
  const [note, setNote] = useState("");
  const blocked = proof?.missing ?? false;

  return (
    <div className="grid gap-3">
      {proof && (
        <p className="text-sm text-muted-foreground">{d.signatureNote}</p>
      )}
      {can.sign && blocked && (
        <ToneCallout tone="warning">{d.proofMissing}</ToneCallout>
      )}
      {can.send && proof && (
        <TextareaField
          name="sendNote"
          label={d.sendLabel}
          aria-required
          rows={2}
          maxLength={2000}
          value={note}
          disabled={pending}
          onChange={(event) => setNote(event.target.value)}
        />
      )}
      <div className="flex flex-wrap items-end gap-3">
        {can.sign && (
          <>
            <Field
              name="signedOn"
              type="date"
              label={t.signedOnLabel}
              aria-required
              hint={t.signedOnHint}
              max={today}
              value={signedOn}
              disabled={pending}
              onChange={(event) => setSignedOn(event.target.value)}
              className="h-10 w-fit text-base md:text-sm"
            />
            <Button
              size="lg"
              disabled={pending || !signedOn || blocked}
              onClick={() => onSign(signedOn)}
            >
              {t.sign}
            </Button>
          </>
        )}
        {can.send && (
          <Button
            size="lg"
            variant="outline"
            disabled={pending || (proof !== null && note.trim() === "")}
            onClick={() => onSend(note)}
          >
            {t.send}
          </Button>
        )}
      </div>
    </div>
  );
}
