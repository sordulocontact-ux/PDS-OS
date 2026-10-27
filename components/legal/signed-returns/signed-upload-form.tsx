"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { FilePickField } from "@/components/ui/file-pick-field";
import { signedReturns } from "@/lib/i18n/fr/signed-returns";
import { signedFileError } from "@/lib/legal/signed-returns/errors";
import {
  openSignedReturnSlot,
  submitSignedReturn,
} from "@/lib/legal/signed-returns/public-actions";
import { createClient } from "@/lib/supabase/client";

const fr = { signedReturns };

const t = fr.signedReturns;

const BUCKET = {
  contract: "contract-files",
  bulletin: "formality-signatures",
} as const;

/**
 * The signed document deposited on the person's page (proto « Projet
 * complet »: « Votre contrat signé * » + « Envoyer mon contrat signé »,
 * « Le bulletin signé * » + « Envoyer le bulletin signé »). A PDF only,
 * read by its first bytes: anything else is refused in red with its reason,
 * before anything is sent.
 */
export function SignedUploadForm({
  token,
  kind,
  id,
  label,
  submitLabel,
  doneLabel,
}: {
  token: string;
  kind: "contract" | "bulletin";
  id: string;
  label: string;
  submitLabel: string;
  doneLabel: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fieldId = `signed-${kind}-${id.slice(0, 8)}`;
  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        if (!file) return setFileError(t.errors.file);
        start(async () => {
          const refused = await signedFileError(file);
          if (refused) return setFileError(refused);
          const slot = await openSignedReturnSlot({ token, kind, id });
          if (!slot.ok) return setError(slot.error);
          const { error: upload } = await createClient()
            .storage.from(BUCKET[kind])
            .upload(slot.path, file, {
              contentType: "application/pdf",
              upsert: false,
            });
          if (upload) {
            console.error("SignedUploadForm:", upload.message);
            return setError(t.errors.upload);
          }
          const result = await submitSignedReturn({
            token,
            kind,
            id,
            path: slot.path,
            fileName: file.name,
          });
          if (!result.ok) return setError(result.error);
          toast.success(`${doneLabel}.`);
        });
      }}
    >
      <FilePickField
        id={fieldId}
        label={`${label} *`}
        hint={t.portal.fileHint}
        chosenLabel={t.portal.fileChosen}
        file={file}
        error={fileError}
        onFile={(chosen) => {
          setFile(chosen);
          setFileError(null);
          // Said at once, not only at the submit.
          void signedFileError(chosen).then(setFileError);
        }}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <div>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
