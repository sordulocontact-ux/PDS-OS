"use client";

import { useState, useTransition } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import { FORM_FIELDS } from "@/lib/legal/forms/definition";
import { submitLegalFormComplement } from "@/lib/legal/forms/public-actions";

const t = fr.legalForms;

/**
 * « Il manque une information à votre fiche » (JUR-06): only the fields the
 * team asked for, from the fiche's private link, then the fiche goes back
 * to the team. Every field is required; each empty one says so after a
 * first try, the first one takes the focus.
 */
export function ComplementForm({
  linkKey,
  missing,
}: {
  linkKey: string;
  missing: string[];
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(missing.map((id) => [id, ""])),
  );
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const empty = missing.filter((id) => !values[id]?.trim());

  if (done)
    return <ToneCallout tone="success">{t.public.complement.done}</ToneCallout>;

  const send = () => {
    setTried(true);
    if (empty.length > 0) {
      setError(t.public.complement.missing);
      document.getElementById(`complement-${empty[0]}`)?.focus();
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await submitLegalFormComplement(linkKey, values);
      if (!result.ok) return setError(result.error);
      setDone(true);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {missing.map((id) => {
        const field = FORM_FIELDS.find((f) => f.id === id);
        const label = t.fields[id] ?? id;
        const err =
          tried && !values[id]?.trim() ? t.public.required : undefined;
        const set = (value: string) =>
          setValues((current) => ({ ...current, [id]: value }));
        return field?.type === "textarea" ? (
          <TextareaField
            key={id}
            id={`complement-${id}`}
            name={id}
            label={label}
            aria-required
            error={err}
            rows={3}
            maxLength={2000}
            value={values[id] ?? ""}
            onChange={(event) => set(event.target.value)}
          />
        ) : (
          <Field
            key={id}
            id={`complement-${id}`}
            name={id}
            type={field?.type === "email" ? "email" : "text"}
            label={label}
            aria-required
            error={err}
            maxLength={300}
            autoComplete="off"
            value={values[id] ?? ""}
            onChange={(event) => set(event.target.value)}
          />
        );
      })}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <Button
        type="button"
        size="lg"
        className="self-start"
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={send}
      >
        {pending ? t.public.complement.sending : t.public.complement.send}
      </Button>
    </div>
  );
}
