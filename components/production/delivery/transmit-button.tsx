"use client";

import { useState, type FormEvent } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { DialogFormActions } from "@/components/production/prep/need-dialog-actions";
import { usePrepSubmit } from "@/components/production/prep/use-prep-submit";
import { Button } from "@/components/ui/button";
import { FactList } from "@/components/ui/fact-list";
import { FilterChip } from "@/components/ui/filter-chip";
import { FormDialog } from "@/components/ui/form-dialog";
import { fr } from "@/lib/i18n/fr";
import { transmitToActivations } from "@/lib/production/delivery/handoff-actions";

const t = fr.productionDelivery.handoff;

/**
 * « Transmettre à Activations »: the proposal prepared by code (version,
 * formats from the Fiche, delivery date, constraints known) shown to the
 * owner, who may untick a format and complete the constraints; nothing is
 * recorded before « Confirmer la transmission ».
 */
export function TransmitButton({
  projectId,
  sheetId,
  again,
  proposal,
}: {
  projectId: string;
  sheetId: string;
  // A transmission exists but the delivery changed since.
  again: boolean;
  proposal: {
    version: string | null;
    finalUrl: string | null;
    deliveredOn: string;
    formats: string[];
    constraints: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const [formats, setFormats] = useState<string[]>(proposal.formats);
  const close = () => setOpen(false);
  const { pending, error, run } = usePrepSubmit(close, t.done);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const constraints = String(
      new FormData(event.currentTarget).get("constraints") ?? "",
    );
    run(() =>
      transmitToActivations({
        projectId,
        sheetId,
        formats: proposal.formats.filter((f) => formats.includes(f)),
        constraints,
      }),
    );
  }

  const toggle = (format: string) =>
    setFormats((current) =>
      current.includes(format)
        ? current.filter((f) => f !== format)
        : [...current, format],
    );

  return (
    <>
      <Button
        size="sm"
        onClick={() => {
          setFormats(proposal.formats);
          setOpen(true);
        }}
      >
        {again ? t.again : t.open}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.dialogTitle}
        description={t.dialogDescription}
        closeLabel={fr.productionDelivery.close}
      >
        <form noValidate className="flex flex-col gap-5" onSubmit={submit}>
          <FactList
            facts={[
              {
                label: proposal.version ? t.version : t.finalLink,
                value: proposal.version ?? proposal.finalUrl,
                valueClassName: proposal.version ? undefined : "break-all",
              },
              { label: t.deliveredOn, value: proposal.deliveredOn },
              { label: t.status, value: t.statusValue },
            ]}
          />
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">{t.formats}</legend>
            {proposal.formats.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.noFormats}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {proposal.formats.map((format) => (
                  <FilterChip
                    key={format}
                    pressed={formats.includes(format)}
                    onClick={() => toggle(format)}
                  >
                    {format}
                  </FilterChip>
                ))}
              </div>
            )}
          </fieldset>
          <TextareaField
            name="constraints"
            label={t.constraints}
            hint={t.constraintsHint}
            rows={3}
            maxLength={2000}
            defaultValue={proposal.constraints ?? ""}
          />
          {error && <FormMessage kind="error">{error}</FormMessage>}
          <DialogFormActions
            pending={pending}
            submitLabel={t.confirm}
            onCancel={close}
          />
        </form>
      </FormDialog>
    </>
  );
}
