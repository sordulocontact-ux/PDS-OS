"use client";

import { useRef, useState } from "react";

import { Field } from "@/components/auth/field";
import { Button } from "@/components/ui/button";
import { laboCaptures } from "@/lib/i18n/fr/labo-captures";

const fr = { laboCaptures };

/**
 * Repérage: a TikTok or Instagram link typed or pasted in a field, read
 * like a screenshot. The field is required only for this form: an empty
 * submit says so on the field (no disabled button).
 */
export function CaptureLinkForm({
  onLink,
}: {
  onLink: (text: string) => void;
}) {
  const t = fr.laboCaptures.link;
  const [error, setError] = useState<string>();
  const input = useRef<HTMLInputElement>(null);

  return (
    <form
      noValidate
      className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        const field = input.current;
        const value = field?.value.trim() ?? "";
        if (!value) {
          setError(t.required);
          field?.focus();
          return;
        }
        setError(undefined);
        onLink(value);
        if (field) field.value = "";
      }}
    >
      <Field
        ref={input}
        name="capture-link"
        label={t.label}
        placeholder={t.placeholder}
        type="text"
        inputMode="url"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-required
        error={error}
        onChange={() => error && setError(undefined)}
      />
      <Button type="submit" variant="outline">
        {t.submit}
      </Button>
    </form>
  );
}
