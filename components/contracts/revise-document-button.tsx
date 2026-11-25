"use client";

import { useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { DocumentEditor } from "@/components/contracts/document-editor";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import { reviseContractDocument } from "@/lib/legal/contracts/actions";

const fr = { legalContracts };

/** « Modifier une clause »: a new version of the text with its reason
 * (« explicite, versionnée, auditée »). */
export function ReviseDocumentButton({
  contractId,
  body,
}: {
  contractId: string;
  body: string;
}) {
  const t = fr.legalContracts.document;
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(form: FormData) {
    startTransition(async () => {
      const result = await reviseContractDocument({
        contractId,
        body: String(form.get("body") ?? ""),
        comment: String(form.get("comment") ?? ""),
      });
      if (!result.ok) return setError(result.error);
      setOpen(false);
    });
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        {t.revise}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          setError(null);
        }}
        title={t.reviseTitle}
        description={t.reviseBody}
        closeLabel={fr.legalContracts.templates.close}
        size="wide"
      >
        <form action={submit} className="flex flex-col gap-4">
          <DocumentEditor
            name="body"
            label={t.reviseText}
            defaultValue={body}
          />
          <TextareaField
            name="comment"
            label={t.reviseComment}
            required
            rows={2}
            maxLength={2000}
          />
          {error && <FormMessage kind="error">{error}</FormMessage>}
          <Button
            type="submit"
            size="lg"
            className="self-end"
            disabled={pending}
            aria-busy={pending || undefined}
          >
            {t.reviseSubmit}
          </Button>
        </form>
      </FormDialog>
    </>
  );
}
