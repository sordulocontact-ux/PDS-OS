"use client";

import { useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { Button } from "@/components/ui/button";
import { productionPreprod } from "@/lib/i18n/fr/production-preprod";
import {
  markProductionReady,
  setReadinessCheck,
} from "@/lib/production/preprod/actions-readiness";
import { needsProof, type CheckRow } from "@/lib/production/preprod/readiness";
import type { Member } from "@/lib/framing/related";
import type { NetworkOption } from "@/lib/production/sheet";
import { useState } from "react";

import { IconBan, IconUserPlus } from "@/components/icons";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { IconCheck, IconXmark } from "nucleo-sharp-essential";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { DialogButton } from "@/components/ui/dialog-button";
import { AssignForm, DerogateForm } from "./readiness-dialogs";

const fr = { productionPreprod };

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
  const actions: RowAction[] = [
    {
      key: "assign",
      label: t.assign,
      icon: IconUserPlus,
      dialog: {
        title: t.assignTitle(label),
        description: t.assignDescription,
        body: (close) => (
          <AssignForm
            projectId={projectId}
            sheetId={sheetId}
            row={row}
            members={members}
            contacts={contacts}
            onDone={close}
          />
        ),
      },
    },
    {
      key: "required",
      label: row.required ? t.unrequire : t.require,
      icon: row.required ? IconXmark : IconCheck,
      onSelect: () => set(null, !row.required),
    },
    ...(row.state === "confirmed"
      ? []
      : [
          {
            key: "derogate",
            label: t.derogate,
            icon: IconBan,
            dialog: {
              title: t.derogateTitle(label),
              description: t.derogateDescription,
              body: (close: () => void) => (
                <DerogateForm
                  projectId={projectId}
                  sheetId={sheetId}
                  row={row}
                  onDone={close}
                />
              ),
            },
          },
        ]),
  ];
  // One text button (the main gesture), the rest in « ⋯ » (Sacha 27/11/2026).
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {row.state === "confirmed" ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => set(false, null)}
        >
          {t.withdraw}
        </Button>
      ) : (
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
      )}
      <RowActions label={t.more(label)} actions={actions} />
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
