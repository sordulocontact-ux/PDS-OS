"use client";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { productionLink } from "@/lib/i18n/fr/production-link";
import { addGearByLink } from "@/lib/production/provider/journey-actions";

import { useLinkSubmit } from "./use-link-submit";

const fr = { productionLink };

const t = fr.productionLink.gear;

/** The director of photography's list: one article a line, sent as needs
 * to price for the line producer. */
export function LinkGearForm({ token }: { token: string }) {
  const { pending, error, run } = useLinkSubmit();
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const lines = String(new FormData(form).get("lines") ?? "");
        run(
          () => addGearByLink({ token, lines }),
          t.done(lines.split("\n").filter((l) => l.trim()).length),
          () => form.reset(),
        );
      }}
    >
      <TextareaField
        name="lines"
        label={t.lines}
        required
        rows={6}
        maxLength={10000}
        placeholder={"Sony FX6\n2 × Aputure 600d"}
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
