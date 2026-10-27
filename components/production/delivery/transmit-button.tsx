"use client";

import { useState, type FormEvent } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { Button } from "@/components/ui/button";
import { FactList } from "@/components/ui/fact-list";
import { FilterChip } from "@/components/ui/filter-chip";
import { FormDialog } from "@/components/ui/form-dialog";
import { OptionSelect } from "@/components/projects/option-select";
import type { Member } from "@/lib/framing/related";
import { productionClosure } from "@/lib/i18n/fr/production-closure";
import { productionDelivery } from "@/lib/i18n/fr/production-delivery";
import { transmitToActivations } from "@/lib/production/delivery/handoff-actions";

import { HandoffExports } from "./handoff-exports";

const fr = { productionDelivery, productionClosure };

const t = fr.productionDelivery.handoff;
const c = fr.productionClosure.handoff;

/**
 * « Transmettre à Activations »: the proposal prepared by code (version,
 * formats from the Fiche, delivery date, constraints known, the files sent
 * and what is expected of each) shown to the owner, who names the person in
 * charge of Activations (prefilled with whom the deliverable is entrusted
 * to), may untick a format and complete the constraints; nothing is
 * recorded before « Confirmer la transmission » (PROD-039).
 */
export function TransmitButton({
  projectId,
  sheetId,
  again,
  proposal,
  members,
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
    exports: { label: string; url: string | null; spec: string | null }[];
    recipientId: string | null;
  };
  members: Member[];
}) {
  const [open, setOpen] = useState(false);
  const [formats, setFormats] = useState<string[]>(proposal.formats);
  const [recipientError, setRecipientError] = useState<string>();
  const close = () => setOpen(false);
  const { pending, error, run } = useWriteSubmit(close, t.done);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const constraints = String(data.get("constraints") ?? "");
    const recipientPersonId = String(data.get("recipient") ?? "");
    setRecipientError(recipientPersonId ? undefined : c.recipientRequired);
    if (!recipientPersonId) {
      event.currentTarget
        .querySelector<HTMLElement>("#handoff-recipient")
        ?.focus();
      return;
    }
    run(() =>
      transmitToActivations({
        projectId,
        sheetId,
        formats: proposal.formats.filter((f) => formats.includes(f)),
        constraints,
        recipientPersonId,
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
          setRecipientError(undefined);
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
          <OptionSelect
            id="handoff-recipient"
            name="recipient"
            label={c.recipient}
            hint={c.recipientHint}
            required
            items={Object.fromEntries(members.map((m) => [m.personId, m.name]))}
            defaultValue={
              members.some((m) => m.personId === proposal.recipientId)
                ? proposal.recipientId
                : null
            }
            error={recipientError}
          />
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">{c.exports}</p>
            <p className="text-sm text-muted-foreground">{c.exportsHint}</p>
            {proposal.exports.length === 0 ? (
              <p className="text-sm text-muted-foreground">{c.noExports}</p>
            ) : (
              <HandoffExports exports={proposal.exports} />
            )}
          </div>
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
