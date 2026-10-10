"use client";

import { Field } from "@/components/auth/field";
import { ChipChoice } from "@/components/ui/chip-choice";
import {
  FILES_TAB_CATEGORIES,
  MAX_DESCRIPTION_LENGTH,
  type FileOwnerKind,
} from "@/lib/catalog/file-rules";
import { fr } from "@/lib/i18n/fr";

// What a file is, in the add and edit modals: its category (one choice, in
// pills), then a free precision. Choosing Contract says who will read it.
export function FileDetailsFields({
  kind,
  category,
  onCategory,
  description,
  onDescription,
  categoryError,
  disabled = false,
  categories,
}: {
  kind: FileOwnerKind;
  category: string | null;
  onCategory: (category: string) => void;
  description: string;
  onDescription: (description: string) => void;
  categoryError?: string;
  disabled?: boolean;
  // A scoped writer: only these categories are offered.
  categories?: readonly string[];
}) {
  const t = fr.catalogFiles;
  const labels: Record<string, string> = t.categories[kind];

  return (
    <>
      <fieldset disabled={disabled} className="contents">
        <ChipChoice
          name="category"
          legend={t.fields.category}
          required
          options={(FILES_TAB_CATEGORIES[kind] as readonly string[])
            .filter((value) => !categories || categories.includes(value))
            .map((value) => ({ value, label: labels[value] }))}
          value={category}
          onChange={(value) => value && onCategory(value)}
          hint={
            category === "contract" ? t.fields.contractNote[kind] : undefined
          }
          error={categoryError}
        />
      </fieldset>
      <Field
        name="description"
        label={t.fields.description}
        hint={t.fields.descriptionHint}
        autoComplete="off"
        maxLength={MAX_DESCRIPTION_LENGTH}
        placeholder={t.fields.placeholders[kind][category ?? "other"]}
        value={description}
        disabled={disabled}
        onChange={(event) => onDescription(event.target.value)}
      />
    </>
  );
}
