"use client";

import { useState, type FormEvent } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import { requestProposalVersion } from "@/lib/production/proposal/actions";

const t = fr.productionProposal.request;

/** « Demander une nouvelle version » (proto crequest): the reason, sent to
 * the director; the retained version stays retained meanwhile. */
export function ProposalRequestForm({
  projectId,
  sheetId,
  retained,
  director,
}: {
  projectId: string;
  sheetId: string;
  retained: number;
  director: string;
}) {
  const [open, setOpen] = useState(false);
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(() => setOpen(false), t.done);
  if (!open)
    return (
      <div>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          {t.open}
        </Button>
      </div>
    );
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = String(
      new FormData(event.currentTarget).get("reason") ?? "",
    ).trim();
    setMissing(!reason);
    if (!reason) return;
    run(() => requestProposalVersion({ projectId, sheetId, reason }));
  }
  return (
    <form
      noValidate
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-xl bg-[var(--surface-soft)] p-4"
    >
      <h3 className="font-semibold">{t.open}</h3>
      <p className="text-[color:var(--text-secondary)]">{t.note(retained)}</p>
      <TextareaField
        name="reason"
        label={t.reason}
        required
        rows={2}
        maxLength={1000}
        error={missing ? t.reasonRequired : undefined}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {t.submit(director)}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          {fr.dialogs.cancel}
        </Button>
      </div>
    </form>
  );
}
