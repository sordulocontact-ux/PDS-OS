"use client";

import { useState, type FormEvent } from "react";

import { NoteForm } from "@/components/distribution/note-form";

import { FieldError, FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogButton } from "@/components/ui/dialog-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { Reserve } from "@/lib/distribution/closure";
import {
  decideDistributionClosure,
  proposeDistributionClosure,
  reopenDistributionClosure,
} from "@/lib/distribution/closure-actions";
import { fr } from "@/lib/i18n/fr";

const t = fr.distribution.closure;

/** « Proposer une clôture avec réserves »: the recap, the arbitration and an
 * explicit confirmation that the reserves stay unverified (CA15). */
export function ProposeReservesButton({
  projectId,
  reserves,
}: {
  projectId: string;
  reserves: Reserve[];
}) {
  return (
    <DialogButton
      label={t.proposeReserves}
      variant="default"
      title={t.reservesFormTitle}
      description={t.reservesFormDescription}
      wide
    >
      {(close) => (
        <ReservesForm
          projectId={projectId}
          reserves={reserves}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}

function ReservesForm({
  projectId,
  reserves,
  onDone,
}: {
  projectId: string;
  reserves: Reserve[];
  onDone: () => void;
}) {
  const [errors, setErrors] = useState<{ note?: string; ack?: string }>({});
  const { pending, error, run } = useWriteSubmit(onDone, t.proposed);

  function submit(event: FormEvent<HTMLFormElement>) {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const arbitration = String(data.get("arbitration") ?? "");
    const acknowledged = data.get("acknowledged") === "on";
    const next = {
      note: arbitration.trim() ? undefined : t.arbitrationRequired,
      ack: acknowledged ? undefined : t.acknowledgeRequired,
    };
    setErrors(next);
    if (next.note || next.ack) return;
    run(() =>
      proposeDistributionClosure({
        projectId,
        kind: "reserves",
        arbitration,
        acknowledged,
      }),
    );
  }

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={submit}>
      <ul className="grid gap-3 rounded-xl border border-border p-4 text-sm">
        {reserves.map((reserve) => (
          <li key={reserve.cause} className="grid gap-1">
            <p className="font-medium">{reserve.label}</p>
            <ul className="grid gap-0.5 text-muted-foreground">
              {reserve.details.map((detail) => (
                <li key={detail} className="break-words">
                  {detail}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <TextareaField
        name="arbitration"
        label={t.arbitration}
        rows={3}
        maxLength={2000}
        required
        error={errors.note}
      />
      <div className="grid gap-1.5">
        <label className="flex items-start gap-3 text-sm font-medium">
          <Checkbox
            name="acknowledged"
            className="mt-0.5"
            aria-invalid={errors.ack ? true : undefined}
            aria-describedby={errors.ack ? "acknowledged-error" : undefined}
          />
          {t.acknowledge}
        </label>
        {errors.ack && (
          <FieldError id="acknowledged-error">{errors.ack}</FieldError>
        )}
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.proposeSubmit}
        onCancel={onDone}
      />
    </form>
  );
}

/** « Refuser » a proposed closure, with the reason. */
export function RejectClosureButton({
  projectId,
  closureId,
}: {
  projectId: string;
  closureId: string;
}) {
  return (
    <DialogButton
      label={t.reject}
      title={t.rejectTitle}
      description={t.rejectBody}
    >
      {(close) => (
        <NoteForm
          label={t.rejectNote}
          submitLabel={t.reject}
          done={t.decided}
          onDone={close}
          send={(note) =>
            decideDistributionClosure({
              projectId,
              closureId,
              approve: false,
              note,
            })
          }
        />
      )}
    </DialogButton>
  );
}

/** « Rouvrir » a closed follow-up: the decision stays, the reopening is added. */
export function ReopenClosureButton({ projectId }: { projectId: string }) {
  return (
    <DialogButton
      label={t.reopen}
      title={t.reopenTitle}
      description={t.reopenBody}
    >
      {(close) => (
        <NoteForm
          label={t.reopenNote}
          submitLabel={t.reopen}
          done={t.reopened}
          onDone={close}
          send={(note) => reopenDistributionClosure({ projectId, note })}
        />
      )}
    </DialogButton>
  );
}
