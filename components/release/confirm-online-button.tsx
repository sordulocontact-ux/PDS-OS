"use client";

import { useState, useTransition, type FormEvent } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { fr } from "@/lib/i18n/fr";
import { confirmOnline } from "@/lib/release/delivery-actions";

const today = () => new Date().toLocaleDateString("sv-SE");

/** « Confirmer la mise en ligne », when the detection does not find it. */
export function ConfirmOnlineButton({
  projectId,
  releaseId,
  deliveredOn,
}: {
  projectId: string;
  releaseId: string;
  deliveredOn: string;
}) {
  const t = fr.releaseDelivery;
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await confirmOnline({
        projectId,
        releaseId,
        onlineOn: String(data.get("onlineOn") ?? ""),
        url: String(data.get("url") ?? ""),
      });
      if (result.ok) setOpen(false);
      else setError(result.error);
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        {t.confirmOnline}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={(next) => {
          setError(null);
          setOpen(next);
        }}
        title={t.confirmOnline}
        description={t.confirmOnlineDescription}
        closeLabel={t.close}
      >
        <form noValidate className="flex flex-col gap-5" onSubmit={submit}>
          <Field
            name="onlineOn"
            label={t.onlineOn}
            type="date"
            required
            defaultValue={today()}
            min={deliveredOn}
            max={today()}
          />
          <Field
            name="url"
            label={t.onlineUrl}
            hint={t.onlineUrlHint}
            type="url"
            inputMode="url"
            maxLength={2048}
            placeholder="https://"
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
              {pending ? t.submitting : t.confirmSubmit}
            </Button>
          </div>
        </form>
      </FormDialog>
    </>
  );
}
