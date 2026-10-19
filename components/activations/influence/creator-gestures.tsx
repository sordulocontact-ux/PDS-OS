"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { FilePickField } from "@/components/ui/file-pick-field";
import {
  declareCreatorPublication,
  openCreatorInvoiceSlot,
  submitCreatorContent,
  submitCreatorInvoice,
} from "@/lib/activations/influence/creator-actions";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/client";

const t = fr.activationCreator;

type Result = { ok: true } | { ok: false; error: string };

function useSend(sent: string) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (task: () => Promise<Result>) => {
    setError(null);
    start(async () => {
      const result = await task();
      if (!result.ok) return setError(result.error);
      toast.success(`${sent}.`);
      router.refresh();
    });
  };
  return { pending, error, run };
}

/**
 * A link the creator sends from her private page (proto creatorPortal):
 * her content (« Envoyer la V2 ») or her publication (« Déclarer la
 * publication »); the database checks the token and the step.
 */
export function CreatorLinkForm({
  token,
  kind,
  label,
  submitLabel,
  placeholder,
}: {
  token: string;
  kind: "content" | "publication";
  label: string;
  submitLabel: string;
  placeholder: string;
}) {
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useSend(
    kind === "content" ? t.sent.content : t.sent.publication,
  );
  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const url = String(
          new FormData(event.currentTarget).get("url") ?? "",
        ).trim();
        const bad = !/^https?:\/\/\S+$/.test(url);
        setMissing(bad);
        if (bad) return;
        run(() =>
          kind === "content"
            ? submitCreatorContent({ token, url })
            : declareCreatorPublication({ token, url }),
        );
      }}
    >
      <Field
        name="url"
        type="url"
        inputMode="url"
        label={label}
        placeholder={placeholder}
        required
        error={missing ? t.errors.url : undefined}
      />
      <div>
        <Button type="submit" size="lg" disabled={pending}>
          {submitLabel}
        </Button>
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </form>
  );
}

/** « Envoyer la facture »: the file goes to a one-time path, then is
 * recorded on her payment (read by PDS's budget readers only). */
export function CreatorInvoiceForm({ token }: { token: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useSend(t.sent.invoice);
  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setMissing(!file);
        if (!file) return;
        run(async () => {
          const slot = await openCreatorInvoiceSlot({
            token,
            fileName: file.name,
          });
          if (!slot.ok) return slot;
          const { error: upload } = await createClient()
            .storage.from("activation-files")
            .upload(slot.path, file, {
              contentType: file.type || "application/octet-stream",
              upsert: false,
            });
          if (upload) return { ok: false, error: t.errors.upload };
          return submitCreatorInvoice({
            token,
            path: slot.path,
            fileName: file.name,
            mime: file.type,
            bytes: file.size,
          });
        });
      }}
    >
      <FilePickField
        id="creator-invoice"
        label={t.invoiceFile}
        hint={fr.activations.fileHint}
        chosenLabel={fr.activations.fileChosen}
        file={file}
        error={missing ? t.errors.file : undefined}
        onFile={setFile}
      />
      <div>
        <Button type="submit" size="lg" disabled={pending}>
          {t.sendInvoice}
        </Button>
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </form>
  );
}
