"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { CONTRACT_TYPES, type ContractType } from "@/lib/contracts/types";
import { fr } from "@/lib/i18n/fr";
import { CONTRACT_FIELD_IDS } from "@/lib/legal/contracts/fields";
import { createContractTemplate } from "@/lib/legal/contracts/template-actions";
import { FORM_ROLES, type FormRole } from "@/lib/legal/forms/definition";

export type TemplateDraft = {
  seriesId: string | null;
  name: string;
  type: ContractType;
  roles: FormRole[];
  usage: string;
  body: string;
};

/**
 * A template pasted by a human (« aucun modèle juridique nouveau ni aucune
 * clause n'est inventé »), with the values to inject written {{id}}. A new
 * version starts from the current text; the original is never touched.
 */
export function TemplateForm({
  initial,
  onDone,
  onCancel,
}: {
  initial?: TemplateDraft;
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = fr.legalContracts.templates;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(form: FormData) {
    startTransition(async () => {
      const result = await createContractTemplate({
        seriesId: initial?.seriesId ?? null,
        name: String(form.get("name") ?? ""),
        type: String(form.get("type") ?? "") as ContractType,
        roles: form.getAll("roles").map(String) as FormRole[],
        usage: String(form.get("usage") ?? ""),
        body: String(form.get("body") ?? ""),
      });
      if (!result.ok) return setError(result.error);
      onDone();
    });
  }

  async function copy(id: string) {
    try {
      await navigator.clipboard.writeText(`{{${id}}}`);
      toast.success(`{{${id}}}`);
    } catch {
      toast.error(t.failed);
    }
  }

  return (
    <form action={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="name"
          label={t.form.name}
          required
          maxLength={200}
          defaultValue={initial?.name}
        />
        <OptionSelect
          name="type"
          label={t.form.type}
          items={Object.fromEntries(
            CONTRACT_TYPES.map((type) => [type, fr.contracts.types[type]]),
          )}
          defaultValue={initial?.type ?? "other"}
        />
      </div>
      <OptionSelect
        multiple
        name="roles"
        label={t.form.roles}
        items={Object.fromEntries(
          FORM_ROLES.map((role) => [role, fr.legalForms.roles[role]]),
        )}
        defaultValue={initial?.roles ?? []}
      />
      <Field
        name="usage"
        label={t.form.usage}
        maxLength={500}
        defaultValue={initial?.usage}
      />
      <TextareaField
        name="body"
        label={t.form.body}
        required
        rows={12}
        maxLength={200_000}
        defaultValue={initial?.body}
      />
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{t.form.bodyHint}</p>
        <ul className="flex flex-wrap gap-1.5">
          {CONTRACT_FIELD_IDS.map((id) => (
            <li key={id}>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => copy(id)}
              >
                {fr.legalContracts.fields[id]}
              </Button>
            </li>
          ))}
        </ul>
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {pending ? t.form.submitting : t.form.submit}
        </Button>
      </div>
    </form>
  );
}
