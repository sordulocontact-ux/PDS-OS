"use client";

import { useRef, useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { FilePickField } from "@/components/ui/file-pick-field";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { todayInParis } from "@/lib/insights/dates";
import { fr } from "@/lib/i18n/fr";
import { openProofSlot, payInvoice } from "@/lib/invoices/actions";
import { createClient } from "@/lib/supabase/client";

const t = fr.invoices.team;
const MIMES = ["application/pdf", "image/png", "image/jpeg"] as const;
type Mime = (typeof MIMES)[number];

const mimeOf = (file: File): Mime | null =>
  MIMES.find((m) => m === file.type) ??
  (/\.pdf$/i.test(file.name)
    ? "application/pdf"
    : /\.png$/i.test(file.name)
      ? "image/png"
      : /\.jpe?g$/i.test(file.name)
        ? "image/jpeg"
        : null);

/** « Marquer comme payée » (proto, direction): the transfer made from
 * PDS's bank, its date and its proof. PDS OS pays nothing itself. */
export function PayForm({
  projectId,
  invoiceId,
  receivedOn,
}: {
  projectId: string;
  invoiceId: string;
  // "YYYY-MM-DD": no transfer before the invoice arrived.
  receivedOn: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [paidOn, setPaidOn] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [tried, setTried] = useState(false);
  const submit = useWriteSubmit(() => undefined, t.paid);
  const today = todayInParis();
  const dateError = !paidOn
    ? t.paidOnMissing
    : paidOn > today || paidOn < receivedOn
      ? t.paidOnInvalid
      : undefined;
  const proofError = !proof || !mimeOf(proof) ? t.proofMissing : undefined;

  function send() {
    setTried(true);
    if (dateError || proofError || !proof) {
      requestAnimationFrame(() =>
        root.current
          ?.querySelector<HTMLElement>(
            '[aria-invalid="true"], input[type=file]',
          )
          ?.focus(),
      );
      return;
    }
    const mime = mimeOf(proof)!;
    submit.run(async () => {
      const slot = await openProofSlot(invoiceId, proof.name);
      if (!slot.ok) return slot;
      const { error } = await createClient()
        .storage.from("project-invoices")
        .upload(slot.path, proof, { contentType: mime, upsert: false });
      if (error) return { ok: false, error: fr.invoices.errors.upload_missing };
      return payInvoice(projectId, invoiceId, {
        paidOn,
        path: slot.path,
        fileName: proof.name,
        mime,
      });
    });
  }

  return (
    <div ref={root} className="flex flex-col gap-3">
      <h4 className="font-semibold">{t.payTitle}</h4>
      <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
        {t.payNote}
      </p>
      <div className="max-w-60">
        <Field
          name={`paid-on-${invoiceId}`}
          type="date"
          label={t.paidOn}
          aria-required
          max={today}
          min={receivedOn}
          value={paidOn}
          error={tried ? dateError : undefined}
          onChange={(e) => setPaidOn(e.target.value)}
        />
      </div>
      <FilePickField
        id={`payment-proof-${invoiceId}`}
        label={`${t.proof} *`}
        hint={t.proofHint}
        chosenLabel={t.proofChosen}
        file={proof}
        error={tried ? proofError : null}
        onFile={setProof}
      />
      {submit.error && <FormMessage kind="error">{submit.error}</FormMessage>}
      <Button className="self-start" disabled={submit.pending} onClick={send}>
        {t.pay}
      </Button>
    </div>
  );
}
