"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import {
  markProductionReady,
  setReadinessCheck,
} from "@/lib/production/preprod/actions-readiness";
import { needsProof, type CheckRow } from "@/lib/production/preprod/readiness";
import type { Member } from "@/lib/framing/related";
import type { NetworkOption } from "@/lib/production/sheet";
import { useState } from "react";

import { ConfirmButton } from "@/components/ui/confirm-button";
import { DialogButton } from "@/components/ui/dialog-button";
import { AssignCheckButton, DerogateButton } from "./readiness-dialogs";

const t = fr.productionPreprod.readiness;

/** A check's actions: « Confirmer » (on its evidence, a written proof for
 * permits and backup — PROD-008), « Déroger » with a reason, « Retirer »,
 * « Attribuer » and whether it is required. */
export function ReadinessActions({
  projectId,
  sheetId,
  row,
  members,
  contacts,
}: {
  projectId: string;
  sheetId: string;
  row: CheckRow;
  members: Member[];
  contacts: NetworkOption[];
}) {
  const [pending, startTransition] = useTransition();
  const set = (confirmed: boolean | null, required: boolean | null) =>
    startTransition(async () => {
      const result = await setReadinessCheck({
        projectId,
        sheetId,
        key: row.key,
        confirmed,
        required,
        note: "",
      });
      if (result.ok) toast.success(t.done);
      else toast.error(result.error);
    });
  const label = t.checks[row.key];
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <AssignCheckButton
        projectId={projectId}
        sheetId={sheetId}
        row={row}
        members={members}
        contacts={contacts}
      />
      <Button
        size="xs"
        variant="ghost"
        disabled={pending}
        onClick={() => set(null, !row.required)}
      >
        {row.required ? t.unrequire : t.require}
      </Button>
      {row.state === "confirmed" ? (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => set(false, null)}
        >
          {t.withdraw}
        </Button>
      ) : (
        <>
          <DerogateButton projectId={projectId} sheetId={sheetId} row={row} />
          <DialogButton
            label={t.confirm}
            title={t.confirmTitle(label)}
            description={t.confirmDescription}
          >
            {(close) => (
              <ConfirmCheckForm
                projectId={projectId}
                sheetId={sheetId}
                row={row}
                onDone={close}
              />
            )}
          </DialogButton>
        </>
      )}
    </div>
  );
}

function ConfirmCheckForm({
  projectId,
  sheetId,
  row,
  onDone,
}: {
  projectId: string;
  sheetId: string;
  row: CheckRow;
  onDone: () => void;
}) {
  const { pending, error, run } = useWriteSubmit(onDone, t.done);
  const proof = needsProof(row.key);
  const [missing, setMissing] = useState(false);
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const note = String(
          new FormData(event.currentTarget).get("note") ?? "",
        );
        setMissing(proof && !note.trim());
        if (proof && !note.trim()) return;
        run(() =>
          setReadinessCheck({
            projectId,
            sheetId,
            key: row.key,
            confirmed: true,
            required: null,
            note,
          }),
        );
      }}
    >
      <TextareaField
        id={`check-${row.key}-note`}
        name="note"
        label={proof ? t.proofLabel : t.noteLabel}
        hint={
          row.key === "permits" || row.key === "backup"
            ? t.proofHint[row.key]
            : undefined
        }
        required={proof}
        error={missing ? t.proofMissing : undefined}
        rows={2}
        maxLength={1000}
        defaultValue={row.note ?? ""}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <DialogFormActions
        pending={pending}
        submitLabel={t.confirm}
        onCancel={onDone}
      />
    </form>
  );
}

/** « Marquer prête pour tournage », asked first; the database refuses it
 * while a required check is open. */
export function MarkReadyButton({
  projectId,
  sheetId,
}: {
  projectId: string;
  sheetId: string;
}) {
  return (
    <ConfirmButton
      label={t.markReady}
      variant="default"
      size="lg"
      title={t.markReadyTitle}
      body={t.markReadyBody}
      confirmLabel={t.markReady}
      pendingLabel={t.marking}
      done={t.ready}
      run={() => markProductionReady({ projectId, sheetId })}
    />
  );
}
