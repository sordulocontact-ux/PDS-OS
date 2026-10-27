"use client";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { productionLink } from "@/lib/i18n/fr/production-link";
import { submitDirectionByLink } from "@/lib/production/provider/journey-actions";

import { useLinkSubmit } from "./use-link-submit";

const fr = { productionLink };

const t = fr.productionLink.direction;

/** The director writes the proposal — intention, découpage, references —
 * and sends it to PDS's creative side, from the link. */
export function LinkDirectionForm({
  token,
  current,
}: {
  token: string;
  current: {
    stagingIntent: string | null;
    runOfShow: string | null;
    references: string | null;
  };
}) {
  const { pending, error, run } = useLinkSubmit();
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const v = (k: string) => String(data.get(k) ?? "").trim();
        run(
          () =>
            submitDirectionByLink({
              token,
              stagingIntent: v("stagingIntent"),
              runOfShow: v("runOfShow"),
              references: v("references"),
            }),
          t.done,
        );
      }}
    >
      <TextareaField
        name="stagingIntent"
        label={t.intent}
        required
        rows={4}
        maxLength={4000}
        defaultValue={current.stagingIntent ?? ""}
      />
      <TextareaField
        name="runOfShow"
        label={t.runOfShow}
        hint={t.runOfShowHint}
        required
        rows={6}
        maxLength={4000}
        defaultValue={current.runOfShow ?? ""}
      />
      <TextareaField
        name="references"
        label={t.references}
        rows={3}
        maxLength={4000}
        defaultValue={current.references ?? ""}
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
