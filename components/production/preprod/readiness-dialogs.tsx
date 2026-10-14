"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import {
  HolderSelect,
  holderValue,
} from "@/components/production/holder-select";
import { DialogButton } from "@/components/ui/dialog-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import {
  assignReadinessCheck,
  derogateReadinessCheck,
} from "@/lib/production/preprod/actions-readiness";
import type { CheckRow } from "@/lib/production/preprod/readiness";
import type { NetworkOption } from "@/lib/production/sheet";

const t = fr.productionPreprod.readiness;

type Scope = { projectId: string; sheetId: string; row: CheckRow };

/** « Déroger » (PROD-008): a reason, required. */
export function DerogateButton({ projectId, sheetId, row }: Scope) {
  const label = t.checks[row.key];
  return (
    <DialogButton
      label={t.derogate}
      variant="ghost"
      title={t.derogateTitle(label)}
      description={t.derogateDescription}
    >
      {(close) => (
        <DerogateForm
          projectId={projectId}
          sheetId={sheetId}
          row={row}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}

function DerogateForm({
  projectId,
  sheetId,
  row,
  onDone,
}: Scope & { onDone: () => void }) {
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(onDone, t.derogated);
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const reason = String(
          new FormData(event.currentTarget).get("reason") ?? "",
        ).trim();
        setMissing(!reason);
        if (!reason) return;
        run(() =>
          derogateReadinessCheck({ projectId, sheetId, key: row.key, reason }),
        );
      }}
    >
      <TextareaField
        id={`derogate-${row.key}`}
        name="reason"
        label={t.derogateReason}
        required
        rows={3}
        maxLength={1000}
        error={missing ? t.derogateMissing : undefined}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <DialogFormActions
        pending={pending}
        submitLabel={t.derogate}
        onCancel={onDone}
      />
    </form>
  );
}

/** « Attribuer » (PROD-017): who secures the check. */
export function AssignCheckButton({
  projectId,
  sheetId,
  row,
  members,
  contacts,
}: Scope & { members: Member[]; contacts: NetworkOption[] }) {
  const label = t.checks[row.key];
  return (
    <DialogButton
      label={t.assign}
      variant="ghost"
      title={t.assignTitle(label)}
      description={t.assignDescription}
    >
      {(close) => (
        <AssignForm
          projectId={projectId}
          sheetId={sheetId}
          row={row}
          members={members}
          contacts={contacts}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}

function AssignForm({
  projectId,
  sheetId,
  row,
  members,
  contacts,
  onDone,
}: Scope & {
  members: Member[];
  contacts: NetworkOption[];
  onDone: () => void;
}) {
  const [holder, setHolder] = useState(holderValue(row.holder));
  const { pending, error, run } = useWriteSubmit(onDone, t.assigned);
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        run(() =>
          assignReadinessCheck({ projectId, sheetId, key: row.key, holder }),
        );
      }}
    >
      <HolderSelect
        id={`assign-${row.key}`}
        label={t.assignLabel}
        noneLabel={t.assignNone}
        value={holder}
        current={row.holder}
        members={members}
        contacts={contacts}
        onChange={setHolder}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <DialogFormActions
        pending={pending}
        submitLabel={fr.productionPreprod.save}
        onCancel={onDone}
      />
    </form>
  );
}
