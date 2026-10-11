"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DialogButton } from "@/components/ui/dialog-button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  AGENCY_FIELDS,
  type AgencyField,
} from "@/lib/activations/agency/fields";
import {
  addManualAgencyRow,
  importAgencyMetrics,
} from "@/lib/activations/agency/row-actions";
import { fr } from "@/lib/i18n/fr";

import { SourceForm } from "./source-form";

const t = fr.activationAgency;

export function AddSourceButton({
  projectId,
  activationId,
}: {
  projectId: string;
  activationId: string;
}) {
  return (
    <DialogButton
      label={t.sources.add}
      icon={IconPlus}
      variant="default"
      title={t.sources.addTitle}
      description={t.sources.addDescription}
      wide
    >
      {(close) => (
        <SourceForm
          projectId={projectId}
          activationId={activationId}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}

function ManualRowForm({
  projectId,
  sourceId,
  press,
  onDone,
}: {
  projectId: string;
  sourceId: string;
  press: boolean;
  onDone: () => void;
}) {
  const fields: readonly AgencyField[] =
    AGENCY_FIELDS[press ? "press" : "influence"];
  const { pending, error, run } = useWriteSubmit(onDone, t.sources.rowAdded);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const values = Object.fromEntries(
          fields
            .map((f) => [f, String(data.get(f) ?? "").trim()])
            .filter(([, v]) => v !== ""),
        );
        run(() => addManualAgencyRow({ projectId, sourceId, values }));
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <Field key={f} name={f} label={t.fieldLabels[f]} maxLength={2000} />
        ))}
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {fr.activations.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? fr.activations.saving : t.sources.addRow}
        </Button>
      </div>
    </form>
  );
}

export function ManualRowButton(props: {
  projectId: string;
  sourceId: string;
  press: boolean;
}) {
  return (
    <DialogButton
      label={t.sources.addRow}
      size="xs"
      title={t.sources.addRowTitle}
      description={t.sources.addRowDescription}
      wide
    >
      {(close) => <ManualRowForm {...props} onDone={close} />}
    </DialogButton>
  );
}

/** « Importer les statistiques » of a source, asked first. */
export function ImportMetricsButton({
  projectId,
  activationId,
  sourceId,
}: {
  projectId: string;
  activationId: string;
  sourceId: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button
        type="button"
        size="xs"
        variant="ghost"
        onClick={() => setOpen(true)}
      >
        {t.sources.importMetrics}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          setError(null);
          setOpen(next);
        }}
        title={t.sources.importMetricsTitle}
        description={t.sources.importMetricsBody}
        cancelLabel={fr.dialogs.cancel}
        closeLabel={fr.dialogs.close}
        confirmLabel={t.sources.importMetrics}
        pendingLabel={fr.activations.saving}
        pending={pending}
        error={error}
        onConfirm={() =>
          startTransition(async () => {
            const r = await importAgencyMetrics({
              projectId,
              activationId,
              sourceId,
            });
            if (!r.ok) return setError(r.error);
            toast.success(t.sources.imported(r.count));
            setOpen(false);
          })
        }
      />
    </>
  );
}
