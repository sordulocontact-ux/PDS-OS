"use client";

import { useState } from "react";

import type { EditableReference } from "@/components/design/references/reference-actions";
import {
  TargetPicker,
  type TargetOption,
} from "@/components/design/references/target-picker";
import { useDesignAction } from "@/components/design/work/use-design-action";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  setReferenceTargets,
  updateReference,
} from "@/lib/design/actions/reference-links";
import { fr } from "@/lib/i18n/fr";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  reference: EditableReference;
};

function Actions({
  pending,
  submit,
  submitting,
  onClose,
}: {
  pending: boolean;
  submit: string;
  submitting: string;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button type="button" variant="ghost" size="lg" onClick={onClose}>
        {fr.conceptionRefs.add.cancel}
      </Button>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? submitting : submit}
      </Button>
    </div>
  );
}

/** « Rattacher »: the targets the same resource serves, none = à rattacher. */
export function AttachReferenceDialog({
  open,
  onClose,
  projectId,
  reference,
  options,
}: DialogProps & { options: TargetOption[] }) {
  const t = fr.conceptionRefs;
  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={t.attach.title}
      description={t.attach.description}
      closeLabel={t.add.close}
    >
      <AttachForm
        projectId={projectId}
        reference={reference}
        options={options}
        onClose={onClose}
      />
    </FormDialog>
  );
}

function AttachForm({
  projectId,
  reference,
  options,
  onClose,
}: Omit<DialogProps, "open"> & { options: TargetOption[] }) {
  const t = fr.conceptionRefs;
  const [targets, setTargets] = useState(reference.targets);
  const { pending, run } = useDesignAction();
  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => setReferenceTargets(projectId, reference.id, targets), {
          success: t.attach.saved,
          onSuccess: onClose,
        });
      }}
    >
      <TargetPicker
        legend={t.add.targetsLegend}
        hint={t.add.targetsHint}
        options={options}
        value={targets}
        onChange={setTargets}
        disabled={pending}
      />
      <Actions
        pending={pending}
        submit={t.attach.submit}
        submitting={t.attach.submitting}
        onClose={onClose}
      />
    </form>
  );
}

/** « Modifier »: the reference's title and what to keep from it. */
export function EditReferenceDialog({
  open,
  onClose,
  projectId,
  reference,
}: DialogProps) {
  const t = fr.conceptionRefs;
  const { pending, run } = useDesignAction();
  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={t.edit.title}
      description={t.edit.description}
      closeLabel={t.add.close}
    >
      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          const values = new FormData(e.currentTarget);
          run(
            () =>
              updateReference(
                projectId,
                reference.id,
                String(values.get("title") ?? ""),
                String(values.get("note") ?? ""),
              ),
            { success: t.edit.saved, onSuccess: onClose },
          );
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reference-edit-title">{t.add.titleLabel}</Label>
          <Input
            id="reference-edit-title"
            name="title"
            maxLength={200}
            defaultValue={reference.title ?? ""}
            placeholder={t.add.titlePlaceholder}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reference-edit-note">{t.add.noteLabel}</Label>
          <Textarea
            id="reference-edit-note"
            name="note"
            rows={3}
            maxLength={500}
            defaultValue={reference.note ?? ""}
            placeholder={t.add.notePlaceholder}
          />
        </div>
        <Actions
          pending={pending}
          submit={t.edit.submit}
          submitting={t.edit.submitting}
          onClose={onClose}
        />
      </form>
    </FormDialog>
  );
}
