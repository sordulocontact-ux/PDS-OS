"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import { setRushesByLink } from "@/lib/production/provider/rushes-link-actions";

import { useLinkSubmit } from "./use-link-submit";

const t = fr.productionLink.rushes;

/** « Lien de récupération des rushes » (proto, on the company's link). */
export function LinkRushesForm({ token }: { token: string }) {
  const { pending, error, run } = useLinkSubmit();
  const [missing, setMissing] = useState(false);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const url = String(
          new FormData(event.currentTarget).get("url") ?? "",
        ).trim();
        if (!/^https:\/\/\S+$/.test(url)) return setMissing(true);
        run(() => setRushesByLink({ token, url }), t.done);
      }}
    >
      <Field
        name="url"
        label={t.url}
        required
        type="url"
        inputMode="url"
        placeholder="https://"
        error={missing ? t.errors.url : undefined}
      />
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
