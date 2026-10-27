"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { DialogButton } from "@/components/ui/dialog-button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  CHECK_METHODS,
  CHECK_RESULTS,
  type CheckMethod,
  type CheckResult,
} from "@/lib/activations/model";
import {
  checkEvidence,
  withdrawEvidence,
} from "@/lib/activations/proof-actions";
import { activations } from "@/lib/i18n/fr/activations";

import { ReasonForm } from "@/components/ui/reason-form";

const fr = { activations };

const t = fr.activations.evidence;

function CheckForm({
  projectId,
  evidenceId,
  onDone,
}: {
  projectId: string;
  evidenceId: string;
  onDone: () => void;
}) {
  const [result, setResult] = useState<CheckResult>("verified");
  const [noteMissing, setNoteMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(onDone, t.checked);
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const method = String(data.get("method")) as CheckMethod;
        const note = String(data.get("note") ?? "").trim();
        setNoteMissing(method === "other" && !note);
        if (method === "other" && !note) return;
        run(() =>
          checkEvidence({ projectId, evidenceId, result, method, note }),
        );
      }}
    >
      <ChoiceCards
        name="result"
        legend={t.result}
        required
        value={result}
        onChange={setResult}
        columns={3}
        choices={CHECK_RESULTS.map((r) => ({ value: r, label: t.results[r] }))}
      />
      <OptionSelect
        name="method"
        label={t.method}
        required
        items={Object.fromEntries(CHECK_METHODS.map((m) => [m, t.methods[m]]))}
        defaultValue="link_opened"
      />
      <TextareaField
        name="note"
        label={t.checkNote}
        rows={2}
        maxLength={2000}
        error={noteMissing ? fr.activations.errors.methodRequired : undefined}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {fr.activations.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? fr.activations.saving : t.check}
        </Button>
      </div>
    </form>
  );
}

/** « Vérifier » (writer or PDS validator) and « Retirer » (writer). */
export function EvidenceActions({
  projectId,
  evidenceId,
  canVerify,
  canWithdraw,
}: {
  projectId: string;
  evidenceId: string;
  canVerify: boolean;
  canWithdraw: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {canVerify && (
        <DialogButton
          label={t.check}
          size="xs"
          title={t.checkTitle}
          description={t.checkDescription}
        >
          {(close) => (
            <CheckForm
              projectId={projectId}
              evidenceId={evidenceId}
              onDone={close}
            />
          )}
        </DialogButton>
      )}
      {canWithdraw && (
        <DialogButton
          label={t.withdraw}
          size="xs"
          variant="ghost"
          title={t.withdrawTitle}
          description={t.withdrawDescription}
        >
          {(close) => (
            <ReasonForm
              label={t.withdrawReason}
              submitLabel={t.withdraw}
              doneMessage={t.withdrawn}
              run={(reason) =>
                withdrawEvidence({ projectId, evidenceId, reason })
              }
              onDone={close}
            />
          )}
        </DialogButton>
      )}
    </div>
  );
}
