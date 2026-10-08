"use client";

import { useState, useTransition } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import {
  fieldsFor,
  type FormBlock,
  type FormRole,
} from "@/lib/legal/forms/definition";
import { submitLegalForm } from "@/lib/legal/forms/public-actions";

import { RoleStep } from "./role-step";

/**
 * The fiche de renseignements of an outside person (ticket Juridique 02):
 * « La première question externe est « Quel est votre rôle sur ce projet ? »,
 * en multi-sélection avec Autre », then « un tronc commun, puis les blocs
 * utiles selon les rôles », what is known shown to confirm, never to type
 * again.
 */
export function PublicForm({
  token,
  prefillRoles,
  known,
}: {
  token: string;
  prefillRoles: FormRole[];
  known: Record<string, string>;
}) {
  const t = fr.legalForms;
  const [step, setStep] = useState<"roles" | "fields" | "done">("roles");
  const [roles, setRoles] = useState<FormRole[]>(prefillRoles);
  const [otherRole, setOtherRole] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>(known);
  const [error, setError] = useState<string | null>(null);
  const [flagged, setFlagged] = useState<string[]>([]);
  const [status, setStatus] = useState<"complete" | "action_required">(
    "complete",
  );
  const [pending, startTransition] = useTransition();

  const toggle = (role: FormRole) =>
    setRoles((current) =>
      current.includes(role)
        ? current.filter((r) => r !== role)
        : [...current, role],
    );

  const submit = () =>
    startTransition(async () => {
      setError(null);
      const result = await submitLegalForm(token, {
        roles,
        otherRole: otherRole || null,
        answers,
      });
      if (result.ok) {
        setStatus(result.status);
        setStep("done");
      } else {
        setError(result.error);
        setFlagged([...(result.missing ?? []), ...(result.invalid ?? [])]);
      }
    });

  if (step === "done")
    return (
      <p className="rounded-2xl border bg-background p-6 text-center font-medium">
        {t.public.done[status]}
      </p>
    );

  if (step === "roles")
    return (
      <RoleStep
        roles={roles}
        otherRole={otherRole}
        onToggle={toggle}
        onOtherRole={setOtherRole}
        onNext={() => setStep("fields")}
      />
    );

  const fields = fieldsFor(roles);
  const blocks = [...new Set(fields.map((f) => f.block))] as FormBlock[];
  return (
    <div className="flex flex-col gap-6">
      {blocks.map((block) => (
        <fieldset
          key={block}
          className="flex flex-col gap-4 rounded-2xl border bg-background p-6"
        >
          <legend className="sr-only">{t.blocks[block]}</legend>
          <h2 className="text-lg font-semibold">{t.blocks[block]}</h2>
          {fields
            .filter((field) => field.block === block)
            .map((field) => {
              const label = t.fields[field.id];
              const hint = known[field.id] ? t.public.known : undefined;
              const err = flagged.includes(field.id)
                ? field.required && !answers[field.id]
                  ? t.public.required
                  : t.public.invalid
                : undefined;
              const set = (value: string) =>
                setAnswers((current) => ({ ...current, [field.id]: value }));
              if (field.type === "select")
                return (
                  <OptionSelect
                    key={field.id}
                    name={field.id}
                    label={label}
                    required={field.required}
                    items={t.options[field.id] ?? {}}
                    defaultValue={answers[field.id] ?? null}
                    hint={hint}
                    error={err}
                    onValueChange={set}
                  />
                );
              if (field.type === "textarea")
                return (
                  <TextareaField
                    key={field.id}
                    name={field.id}
                    label={label}
                    aria-required={field.required || undefined}
                    hint={hint}
                    error={err}
                    rows={3}
                    maxLength={2000}
                    value={answers[field.id] ?? ""}
                    onChange={(event) => set(event.target.value)}
                  />
                );
              return (
                <Field
                  key={field.id}
                  name={field.id}
                  type={field.type}
                  label={label}
                  aria-required={field.required || undefined}
                  hint={hint}
                  error={err}
                  maxLength={300}
                  autoComplete="off"
                  value={answers[field.id] ?? ""}
                  onChange={(event) => set(event.target.value)}
                />
              );
            })}
        </fieldset>
      ))}
      <p className="text-sm text-muted-foreground">{t.public.notice}</p>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          disabled={pending}
          onClick={() => setStep("roles")}
        >
          {t.public.back}
        </Button>
        <Button
          type="button"
          size="lg"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={submit}
        >
          {pending ? t.public.submitting : t.public.submit}
        </Button>
      </div>
    </div>
  );
}
