"use client";

import { Field } from "@/components/auth/field";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { networkLists } from "@/lib/i18n/fr/network-lists";

const fr = { networkLists };

export const NEW_LIST_NAME_ID = "network-list-name";

/** What a new list is asked: its name, and whether the team shares it.
 * Submitted as `name` and `shared`; read back with `readNewList`. */
export function NewListFields({
  missing,
  onNameFilled,
  autoFocus = false,
}: {
  // The name was left empty on submit (docs/DESIGN.md « Manques à la
  // validation »).
  missing: boolean;
  onNameFilled: () => void;
  autoFocus?: boolean;
}) {
  const t = fr.networkLists.new;
  return (
    <>
      <Field
        id={NEW_LIST_NAME_ID}
        name="name"
        label={t.name}
        required
        placeholder={t.namePlaceholder}
        maxLength={120}
        autoFocus={autoFocus}
        autoComplete="off"
        // Back to normal as soon as it is filled (docs/DESIGN.md).
        onChange={(event) => event.currentTarget.value.trim() && onNameFilled()}
        error={missing ? t.nameRequired : undefined}
      />
      <CheckboxField name="shared" label={t.share} hint={t.shareHint} />
    </>
  );
}

/** The new list's name (trimmed, empty when missing) and sharing. */
export function readNewList(form: HTMLFormElement) {
  const data = new FormData(form);
  return {
    name: String(data.get("name") ?? "").trim(),
    shared: data.get("shared") === "on",
  };
}
