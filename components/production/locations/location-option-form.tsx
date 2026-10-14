"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { centsToInput } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
import { saveLocationOption } from "@/lib/production/locations/actions";
import type { LocationOption } from "@/lib/production/locations/types";

const t = fr.productionLocations;
const HTTPS = /^https:\/\/\S+$/;

/** A candidate place and what is known of it (PROD-011); `option` null = a
 * new one. */
export function LocationOptionForm({
  projectId,
  sheetId,
  option,
  onDone,
}: {
  projectId: string;
  sheetId: string;
  option: LocationOption | null;
  onDone: () => void;
}) {
  const [verified, setVerified] = useState(option?.verification === "verified");
  const [missing, setMissing] = useState<"name" | "url" | null>(null);
  const { pending, error, run } = useWriteSubmit(onDone, t.saved);

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const text = (key: string) => String(data.get(key) ?? "");
    const lack = !text("name").trim()
      ? "name"
      : text("url").trim() && !HTTPS.test(text("url").trim())
        ? "url"
        : null;
    setMissing(lack);
    if (lack) {
      form.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }
    run(() =>
      saveLocationOption({
        projectId,
        sheetId,
        optionId: option?.id,
        name: text("name"),
        address: text("address"),
        url: text("url"),
        contactNote: text("contactNote"),
        price: text("price"),
        priceNote: text("priceNote"),
        availability: text("availability"),
        constraints: text("constraints"),
        verified,
      }),
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit(event.currentTarget);
      }}
    >
      <Field
        name="name"
        label={t.fields.name}
        required
        maxLength={200}
        defaultValue={option?.name ?? ""}
        error={missing === "name" ? t.fields.name : undefined}
      />
      <Field
        name="address"
        label={t.fields.address}
        maxLength={500}
        defaultValue={option?.address ?? ""}
      />
      <Field
        name="url"
        type="url"
        label={t.fields.url}
        maxLength={2000}
        defaultValue={option?.url ?? ""}
        error={missing === "url" ? t.media.missingUrl : undefined}
      />
      <Field
        name="contactNote"
        label={t.fields.contactNote}
        maxLength={500}
        defaultValue={option?.contactNote ?? ""}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="price"
          label={t.fields.price}
          suffix="€"
          inputMode="decimal"
          defaultValue={
            option?.priceCents == null ? "" : centsToInput(option.priceCents)
          }
        />
        <Field
          name="priceNote"
          label={t.fields.priceNote}
          maxLength={500}
          defaultValue={option?.priceNote ?? ""}
        />
      </div>
      <TextareaField
        name="availability"
        label={t.fields.availability}
        rows={2}
        maxLength={1000}
        defaultValue={option?.availability ?? ""}
      />
      <TextareaField
        name="constraints"
        label={t.fields.constraints}
        rows={3}
        maxLength={2000}
        defaultValue={option?.constraints ?? ""}
      />
      <CheckboxField
        label={t.fields.verified}
        checked={verified}
        onChange={setVerified}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <DialogFormActions
        pending={pending}
        submitLabel={fr.productionPreprod.save}
        onCancel={onDone}
      />
    </form>
  );
}
