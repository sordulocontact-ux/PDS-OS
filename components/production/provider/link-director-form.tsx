"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import { proposeDirectorByLink } from "@/lib/production/provider/director-link-actions";

import { useLinkSubmit } from "./use-link-submit";

const t = fr.productionLink.director;

/** « Votre proposition » (proto portalDirector): name, showreel, why him;
 * then « Proposer un autre réalisateur » opens it again. */
export function LinkDirectorForm({
  token,
  again = false,
}: {
  token: string;
  again?: boolean;
}) {
  const [open, setOpen] = useState(!again);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { pending, error, run } = useLinkSubmit();
  if (!open)
    return (
      <div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          {t.another}
        </Button>
      </div>
    );
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const v = (k: string) => String(data.get(k) ?? "").trim();
        const next: Record<string, string> = {};
        if (!v("name")) next.name = t.errors.name;
        if (!/^https:\/\/\S+$/.test(v("reel"))) next.reel = t.errors.reel;
        setErrors(next);
        if (Object.keys(next).length > 0) return;
        run(
          () =>
            proposeDirectorByLink({
              token,
              name: v("name"),
              reel: v("reel"),
              note: v("note"),
            }),
          t.done,
          () => {
            form.reset();
            if (again) setOpen(false);
          },
        );
      }}
    >
      <h3 className="font-semibold">{t.yours}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="name"
          label={t.name}
          required
          maxLength={200}
          error={errors.name}
        />
        <Field
          name="reel"
          label={t.reel}
          required
          type="url"
          inputMode="url"
          placeholder="https://"
          error={errors.reel}
        />
      </div>
      <TextareaField name="note" label={t.why} rows={2} maxLength={1000} />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div>
        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {t.submit}
        </Button>
      </div>
    </form>
  );
}
