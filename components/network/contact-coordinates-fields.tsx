import { Field } from "@/components/auth/field";
import type { SaveContactResult } from "@/lib/network/actions";
import { network } from "@/lib/i18n/fr/network";
import type { NetworkContactValues } from "@/lib/network/types";

const fr = { network };

/** How to reach a contact of the Réseau: e-mail, phone, website, city. */
export function ContactCoordinatesFields({
  values,
  error,
}: {
  values?: Partial<NetworkContactValues>;
  error: Extract<SaveContactResult, { ok: false }> | null;
}) {
  const t = fr.network.form;
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field
        name="email"
        type="email"
        label={t.email}
        autoComplete="off"
        maxLength={320}
        defaultValue={values?.email ?? ""}
        error={error?.field === "email" ? error.error : undefined}
      />
      <Field
        name="phone"
        type="tel"
        label={t.phone}
        autoComplete="off"
        maxLength={40}
        defaultValue={values?.phone ?? ""}
      />
      <Field
        name="website"
        type="url"
        inputMode="url"
        label={t.website}
        autoComplete="off"
        maxLength={500}
        placeholder={t.websitePlaceholder}
        defaultValue={values?.website ?? ""}
        error={error?.field === "website" ? error.error : undefined}
      />
      <Field
        name="city"
        label={t.city}
        autoComplete="off"
        maxLength={120}
        defaultValue={values?.city ?? ""}
      />
    </div>
  );
}
