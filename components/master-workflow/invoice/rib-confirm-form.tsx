"use client";

import { useState } from "react";

import { FieldError, FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { ToneCallout } from "@/components/ui/tone-callout";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import { confirmBankAccount } from "@/lib/master-workflow/invoice-actions";

const t = fr.masterInvoice.team;

/** « Le RIB a changé » (proto, direction): call the engineer at the number
 * of their Network card, check the box, « Confirmer le nouveau RIB ». */
export function RibConfirmForm({
  projectId,
  accountId,
  name,
}: {
  projectId: string;
  accountId: string;
  name: string;
}) {
  const [checked, setChecked] = useState(false);
  const [tried, setTried] = useState(false);
  const submit = useWriteSubmit(() => undefined, t.confirmed);
  return (
    <div className="flex flex-col gap-3">
      <ToneCallout tone="warning">
        <b className="font-semibold">{t.confirmTitle}</b>{" "}
        {t.confirmCallout(name)}
      </ToneCallout>
      <CheckboxField
        label={t.phoneChecked(name)}
        checked={checked}
        onChange={setChecked}
      />
      {tried && !checked && (
        <FieldError id="rib-check-error">{t.phoneMissing(name)}</FieldError>
      )}
      {submit.error && <FormMessage kind="error">{submit.error}</FormMessage>}
      <Button
        className="self-start"
        disabled={submit.pending}
        onClick={() => {
          setTried(true);
          if (!checked) return;
          submit.run(() => confirmBankAccount(projectId, accountId, true));
        }}
      >
        {t.confirm}
      </Button>
    </div>
  );
}
