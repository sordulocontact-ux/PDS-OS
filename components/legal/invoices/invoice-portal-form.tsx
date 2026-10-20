"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

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
import { fr } from "@/lib/i18n/fr";
import {
  openContactInvoiceSlot,
  submitContactInvoice,
} from "@/lib/legal/invoices/public-actions";

const t = fr.legalInvoices;

/**
 * « Envoyer ma facture » on the person's page (proto « Projet complet »):
 * the PDF, its number, its amount excl. tax — a gap with the contract's
 * fee is explained before it goes. Each missing field turns red on the
 * first try.
 */
export function InvoicePortalForm({
  token,
  needId,
  expectedCents,
}: {
  token: string;
  needId: string;
  expectedCents: number;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [value, setValue] = useState<InvoiceInput>({
    number: "",
    amount: "",
    gap: "",
  });
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const errors = tried ? invoiceErrors(value, expectedCents) : {};
  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        const cents = amountCentsOf(value.amount);
        if (!file || cents === null) return;
        if (Object.keys(invoiceErrors(value, expectedCents)).length > 0) return;
        setError(null);
        start(async () => {
          const slot = await openContactInvoiceSlot({
            token,
            needId,
            fileName: file.name,
          });
          if (!slot.ok) return setError(slot.error);
          if (!(await uploadInvoiceFile(slot.path, file)))
            return setError(t.errors.upload);
          const result = await submitContactInvoice({
            token,
            needId,
            path: slot.path,
            fileName: file.name,
            mime: file.type,
            bytes: file.size,
            number: value.number,
            amountCents: cents,
            gapReason: value.gap,
          });
          if (!result.ok) return setError(result.error);
          toast.success(`${t.portal.sent}.`);
          router.refresh();
        });
      }}
    >
      <FilePickField
        id={`portal-invoice-${needId}`}
        label={`${t.portal.file} *`}
        hint={t.fileHint}
        chosenLabel={t.fileChosen}
        file={file}
        error={tried && !file ? t.errors.file : undefined}
        onFile={setFile}
      />
      <InvoiceFields
        id={`portal-invoice-${needId}`}
        value={value}
        onChange={setValue}
        expectedCents={expectedCents}
        errors={errors}
        gapCallout
      />
      <FormMessage kind="error">{error}</FormMessage>
      <div>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {t.portal.send}
        </Button>
      </div>
    </form>
  );
}
