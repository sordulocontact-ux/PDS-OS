"use client";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import { proposeLocationByLink } from "@/lib/production/provider/journey-actions";

import { useLinkSubmit } from "./use-link-submit";

const t = fr.productionLink.places;

/** The company proposes a place: PDS gives opinions and keeps one. */
export function LinkPlaceForm({ token }: { token: string }) {
  const { pending, error, run } = useLinkSubmit();
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const v = (k: string) => String(data.get(k) ?? "").trim();
        run(
          () =>
            proposeLocationByLink({
              token,
              name: v("name"),
              address: v("address"),
              price: v("price"),
              availability: v("availability"),
              constraints: v("constraints"),
              url: v("url"),
            }),
          t.done,
          () => form.reset(),
        );
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label={t.name} required maxLength={200} />
        <Field name="address" label={t.address} maxLength={500} />
        <Field name="price" label={t.price} inputMode="decimal" suffix="€" />
        <Field
          name="url"
          label={t.url}
          type="url"
          inputMode="url"
          placeholder="https://"
        />
      </div>
      <TextareaField
        name="availability"
        label={t.availability}
        rows={2}
        maxLength={1000}
      />
      <TextareaField
        name="constraints"
        label={t.constraints}
        rows={2}
        maxLength={2000}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div>
        <Button
          type="submit"
          variant="outline"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {t.submit}
        </Button>
      </div>
    </form>
  );
}
