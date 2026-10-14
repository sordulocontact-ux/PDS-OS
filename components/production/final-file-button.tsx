"use client";

import { useState, useTransition, type FormEvent } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { fr } from "@/lib/i18n/fr";
import { setDeliverableFinal } from "@/lib/production/actions";
import { isHttpsLink } from "@/lib/production/rules";

/** « Ajouter le fichier final » / « Remplacer le fichier »: a link to the
 * exports, and a note. */
export function FinalFileButton({
  projectId,
  deliverableId,
  current,
  onVersion = false,
  proposed = null,
}: {
  projectId: string;
  deliverableId: string;
  current: { url: string; note: string | null } | null;
  // No file yet: the validated version's own link, said so (PROD-003).
  proposed?: { url: string; version: number } | null;
  // The creative decision rests on a validated version (a production
  // sheet): a new file only reopens the check and the delivery.
  onVersion?: boolean;
}) {
  const t = fr.production;
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [urlError, setUrlError] = useState<string>();
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const url = String(data.get("url") ?? "");
    if (!isHttpsLink(url)) {
      setUrlError(t.errors.url);
      form.querySelector<HTMLInputElement>("input[name=url]")?.focus();
      return;
    }
    setUrlError(undefined);
    setError(null);
    startTransition(async () => {
      const result = await setDeliverableFinal({
        projectId,
        deliverableId,
        url,
        note: String(data.get("note") ?? ""),
      });
      if (result.ok) setOpen(false);
      else setError(result.error);
    });
  }

  return (
    <>
      <Button
        size="sm"
        variant={current ? "ghost" : "default"}
        onClick={() => setOpen(true)}
      >
        {current ? t.finalReplace : t.finalAdd}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={(next) => {
          setError(null);
          setUrlError(undefined);
          setOpen(next);
        }}
        title={t.finalTitle}
        description={
          onVersion ? t.finalDescriptionOnVersion : t.finalDescription
        }
        closeLabel={t.close}
      >
        <form noValidate className="flex flex-col gap-5" onSubmit={submit}>
          <Field
            name="url"
            label={t.finalUrl}
            hint={
              !current && proposed
                ? t.finalUrlProposed(proposed.version)
                : t.finalUrlHint
            }
            type="url"
            inputMode="url"
            required
            maxLength={2048}
            placeholder="https://"
            defaultValue={current?.url ?? proposed?.url ?? ""}
            error={urlError}
          />
          <TextareaField
            name="note"
            label={t.finalNote}
            hint={t.finalNoteHint}
            rows={2}
            maxLength={1000}
            defaultValue={current?.note ?? ""}
          />
          {error && <FormMessage kind="error">{error}</FormMessage>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => setOpen(false)}
            >
              {t.cancel}
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={pending}
              aria-busy={pending || undefined}
            >
              {pending ? t.saving : t.save}
            </Button>
          </div>
        </form>
      </FormDialog>
    </>
  );
}
