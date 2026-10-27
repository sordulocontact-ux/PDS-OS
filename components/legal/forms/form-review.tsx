"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { legalForms } from "@/lib/i18n/fr/legal-forms";
import type { FormField, FormRole } from "@/lib/legal/forms/definition";

const fr = { legalForms };

/**
 * The last step of a public fiche (JUR-14): what will be sent, once, by
 * theme (the roles, then each block's filled answers), the consent to
 * that use asked apart, then « Envoyer ma fiche ». Back to the fields to
 * change anything.
 */
export function FormReview({
  roles,
  otherRole,
  fields,
  answers,
  organization,
  pending,
  error,
  onBack,
  onSend,
}: {
  roles: FormRole[];
  otherRole: string;
  fields: FormField[];
  answers: Record<string, string>;
  organization: string | null;
  pending: boolean;
  error: string | null;
  onBack: () => void;
  onSend: () => void;
}) {
  const t = fr.legalForms;
  const r = t.public.review;
  const [consent, setConsent] = useState(false);
  const [tried, setTried] = useState(false);
  const shown = (field: FormField) => {
    const value = answers[field.id]?.trim();
    if (!value) return null;
    return field.type === "select"
      ? (t.options[field.id]?.[value] ?? value)
      : value;
  };
  const blocks = [...new Set(fields.map((f) => f.block))].filter((block) =>
    fields.some((f) => f.block === block && shown(f)),
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-2xl border bg-background p-6">
        <h2 className="text-lg font-semibold">{r.title}</h2>
        <dl className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <dt className="text-sm text-muted-foreground">{r.roles}</dt>
            <dd className="font-medium break-words">
              {[...roles.map((role) => t.roles[role]), otherRole.trim()]
                .filter(Boolean)
                .join(", ")}
            </dd>
          </div>
          {blocks.map((block) => (
            <div key={block} className="flex flex-col gap-2">
              <dt className="font-medium">{t.blocks[block]}</dt>
              <dd>
                <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
                  {fields
                    .filter((f) => f.block === block && shown(f))
                    .map((f) => (
                      <div key={f.id} className="contents">
                        <dt className="text-sm text-muted-foreground">
                          {t.fields[f.id]}
                        </dt>
                        <dd className="text-sm break-words">{shown(f)}</dd>
                      </div>
                    ))}
                </dl>
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="flex flex-col gap-3 rounded-2xl border bg-background p-6">
        <h2 className="text-lg font-semibold">{r.consentTitle}</h2>
        <CheckboxField
          checked={consent}
          onChange={setConsent}
          label={r.consent(organization)}
          hint={t.public.notice}
        />
        {tried && !consent && (
          <FormMessage kind="error">{r.consentMissing}</FormMessage>
        )}
      </section>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          disabled={pending}
          onClick={onBack}
        >
          {r.edit}
        </Button>
        <Button
          type="button"
          size="lg"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={() => {
            setTried(true);
            if (consent) onSend();
          }}
        >
          {pending ? t.public.submitting : t.public.submit}
        </Button>
      </div>
    </div>
  );
}
