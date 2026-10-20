"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import {
  InvoiceFields,
  amountCentsOf,
  invoiceErrors,
  type InvoiceInput,
} from "@/components/legal/invoices/invoice-fields";
import { uploadInvoiceFile } from "@/components/legal/invoices/upload-invoice-file";
import { Button } from "@/components/ui/button";
import { FilePickField } from "@/components/ui/file-pick-field";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { todayInParis } from "@/lib/contracts/types";
import { fr } from "@/lib/i18n/fr";
import { addInvoice, openInvoiceTeamSlot } from "@/lib/legal/invoices/actions";

const t = fr.legalInvoices;

/**
 * « Ajouter une facture reçue autrement » (the direction): the PDF, its
 * number, its amount (a gap with its explanation), the day it arrived.
 */
export function InvoiceAddForm({
  projectId,
  needId,
  expectedCents,
  onCancel,
}: {
  projectId: string;
  needId: string;
  expectedCents: number;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [value, setValue] = useState<InvoiceInput>({
    number: "",
    amount: "",
    gap: "",
  });
  const [receivedOn, setReceivedOn] = useState(todayInParis(new Date()));
  const [tried, setTried] = useState(false);
  const { pending, error, run } = useWriteSubmit(
    () => router.refresh(),
    t.added,
  );
  const errors = tried ? invoiceErrors(value, expectedCents) : {};
  return (
    <form
      noValidate
      className="flex flex-col gap-3 rounded-xl border border-[color:var(--selection-border)] p-3.5"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        const cents = amountCentsOf(value.amount);
        if (!file || !receivedOn || cents === null) return;
        if (Object.keys(invoiceErrors(value, expectedCents)).length > 0) return;
        run(async () => {
          const slot = await openInvoiceTeamSlot(needId, "invoice", file.name);
          if (!slot.ok) return slot;
          if (!(await uploadInvoiceFile(slot.path, file)))
            return { ok: false, error: t.errors.upload };
          return addInvoice({
            projectId,
            needId,
            file: {
              path: slot.path,
              name: file.name,
              mime: file.type,
              bytes: file.size,
            },
            number: value.number,
            amountCents: cents,
            gapReason: value.gap,
            receivedOn,
          });
        });
      }}
    >
      <h4 className="font-semibold">{t.addOther}</h4>
      <FilePickField
        id={`invoice-file-${needId}`}
        label={`${t.addFile} *`}
        hint={t.fileHint}
        chosenLabel={t.fileChosen}
        file={file}
        error={tried && !file ? t.errors.file : undefined}
        onFile={setFile}
      />
      <InvoiceFields
        id={`invoice-${needId}`}
        value={value}
        onChange={setValue}
        expectedCents={expectedCents}
        errors={errors}
      />
      <Field
        type="date"
        name={`invoice-received-${needId}`}
        label={t.receivedOn}
        required
        value={receivedOn}
        onChange={(e) => setReceivedOn(e.target.value)}
        error={tried && !receivedOn ? t.errors.received : undefined}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {t.add}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}
