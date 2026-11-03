"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toast";

import { Field } from "@/components/auth/field";
import { FieldError, FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { FilePickField } from "@/components/ui/file-pick-field";
import { productionProvider } from "@/lib/i18n/fr/production-provider";
import { MAX_PRODUCTION_FILE_BYTES } from "@/lib/production/files/rules";
import {
  depositProviderVersion,
  openProviderSlot,
} from "@/lib/production/provider/public-actions";
import { createClient } from "@/lib/supabase/client";

const fr = { productionProvider };

const t = fr.productionProvider.deposit;
const e = fr.productionProvider.errors;
const HTTPS = /^https:\/\/\S+$/;
type Media = "link" | "file";

/**
 * « Déposer une version » from the provider's page (PROD-028): a link, or a
 * file sent straight to a one-time path of the private bucket, then
 * recorded — numbered and submitted by the database, the label notified.
 */
export function DepositVersion({ token }: { token: string }) {
  const [media, setMedia] = useState<Media>("link");
  const [file, setFile] = useState<File | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function deposit(form: HTMLFormElement) {
    const data = new FormData(form);
    const url = String(data.get("url") ?? "").trim();
    const notes = String(data.get("notes") ?? "");
    const lacks = media === "link" ? !HTTPS.test(url) : !file;
    setMissing(lacks);
    setError(null);
    if (lacks) {
      form.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }
    if (file && file.size > MAX_PRODUCTION_FILE_BYTES) {
      setError(e.tooLarge);
      return;
    }
    setPending(true);
    try {
      let path: string | null = null;
      if (media === "file" && file) {
        const slot = await openProviderSlot({ token, fileName: file.name });
        if (!slot.ok) return setError(slot.error);
        const { error: upload } = await createClient()
          .storage.from("production-files")
          .upload(slot.path, file, {
            contentType: file.type || "application/octet-stream",
            upsert: false,
          });
        if (upload) return setError(e.upload);
        path = slot.path;
      }
      const result = await depositProviderVersion({
        token,
        url: media === "link" ? url : null,
        path,
        fileName: file?.name ?? null,
        notes,
      });
      if (!result.ok) return setError(result.error);
      toast.success(t.done(result.number));
      form.reset();
      setFile(null);
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        void deposit(event.currentTarget);
      }}
    >
      <ChoiceCards
        name="media"
        legend={t.legend}
        value={media}
        onChange={(next) => {
          setMedia(next);
          setMissing(false);
        }}
        choices={(["link", "file"] as const).map((m) => ({
          value: m,
          label: t.media[m].label,
          hint: t.media[m].hint,
        }))}
      />
      {media === "link" ? (
        <Field
          name="url"
          type="url"
          inputMode="url"
          label={t.url}
          hint={t.urlHint}
          required
          maxLength={2000}
          error={missing ? t.missing.url : undefined}
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          <FilePickField
            id="provider-version-file"
            label={t.file}
            hint={t.fileHint}
            chosenLabel={t.fileChosen}
            file={file}
            onFile={(f) => {
              setFile(f);
              setMissing(false);
            }}
          />
          {missing && (
            <FieldError id="provider-version-file-error">
              {t.missing.file}
            </FieldError>
          )}
        </div>
      )}
      <TextareaField name="notes" label={t.notes} rows={3} maxLength={4000} />
      <FormMessage kind="error">{error}</FormMessage>
      <div className="flex justify-end">
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {pending ? t.sending : t.submit}
        </Button>
      </div>
    </form>
  );
}
