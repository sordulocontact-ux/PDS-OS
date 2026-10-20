"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { uploadInvoiceFile } from "@/components/legal/invoices/upload-invoice-file";
import { Button } from "@/components/ui/button";
import { FilePickField } from "@/components/ui/file-pick-field";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import {
  markInvoicePaid,
  openInvoiceTeamSlot,
} from "@/lib/legal/invoices/actions";

const t = fr.legalInvoices;

/**
 * « Marquer comme payée » (the direction, proto « Projet complet »): the
 * transfer is made from PDS's bank, then said here with its day and its
 * proof. Each missing field turns red on the first try.
 */
export function InvoicePaidForm({
  projectId,
  needId,
  invoiceId,
}: {
  projectId: string;
  needId: string;
  invoiceId: string;
}) {
  const router = useRouter();
  const [paidOn, setPaidOn] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [tried, setTried] = useState(false);
  const { pending, error, run } = useWriteSubmit(
    () => router.refresh(),
    t.paidDone,
  );
  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (!paidOn || !proof) return;
        run(async () => {
          const slot = await openInvoiceTeamSlot(needId, "proof", proof.name);
          if (!slot.ok) return slot;
          if (!(await uploadInvoiceFile(slot.path, proof)))
            return { ok: false, error: t.errors.upload };
          return markInvoicePaid({
            projectId,
            invoiceId,
            paidOn,
            proof: {
              path: slot.path,
              name: proof.name,
              mime: proof.type,
              bytes: proof.size,
            },
          });
        });
      }}
    >
      <h4 className="font-semibold">{t.markPaid}</h4>
      <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
        {t.markPaidBody}
      </p>
      <Field
        type="date"
        name={`paid-on-${invoiceId}`}
        label={t.paidOn}
        required
        value={paidOn}
        onChange={(event) => setPaidOn(event.target.value)}
        error={tried && !paidOn ? t.paidOnMissing : undefined}
      />
      <FilePickField
        id={`paid-proof-${invoiceId}`}
        label={`${t.proof} *`}
        hint={t.fileHint}
        chosenLabel={t.fileChosen}
        file={proof}
        error={tried && !proof ? t.proofMissing : undefined}
        onFile={setProof}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <div>
        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {t.markPaid}
        </Button>
      </div>
    </form>
  );
}
