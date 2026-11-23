"use client";

import { useState, useTransition } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { ficheNeeded } from "@/lib/legal/forms/completeness";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { legalForms } from "@/lib/i18n/fr/legal-forms";
import {
  fieldsFor,
  type FormBlock,
  type FormRole,
} from "@/lib/legal/forms/definition";
import type { FormRequester } from "@/lib/legal/forms/public";
import { submitLegalForm } from "@/lib/legal/forms/public-actions";

import { FormDone } from "./form-done";
import { FormReview } from "./form-review";
import { DataUseNote, RequesterNote } from "./requester-note";
import { RoleStep } from "./role-step";

const fr = { legalForms };

/**
 * The fiche de renseignements of an outside person (ticket Juridique 02):
 * « La première question externe est « Quel est votre rôle sur ce projet ? »,
 * en multi-sélection avec Autre », then « un tronc commun, puis les blocs
 * utiles selon les rôles », what is known shown to confirm, never to type
 * again.
 */
export function PublicForm({
  intro,
  requester,
  ...props
}: Omit<FormStepsProps, "onSent"> & { intro: string }) {
  // Once sent, the end is alone in the card: no greeting, no « Une
  // question ? » twice, no data notice (retour d'Akili, 02/11/2026).
  const [sent, setSent] = useState<Sent | null>(null);
  if (sent)
    return (
      <FormDone
        status={sent.status}
        sentAt={sent.sentAt}
        requester={requester}
      />
    );
  return (
    <>
      <p className="text-muted-foreground">{intro}</p>
      <FormSteps {...props} requester={requester} onSent={setSent} />
      <RequesterNote requester={requester} />
      <DataUseNote requester={requester} network={props.network} />
    </>
  );
}

type Sent = {
  status: "complete" | "action_required";
  // When the fiche left: the receipt says it (JUR-14).
  sentAt: string;
};

type FormStepsProps = {
  token: string;
  // A Réseau fiche (no project): no project question, no contribution.
  network?: boolean;
  prefillRoles: FormRole[];
  known: Record<string, string>;
  requester: FormRequester;
  onSent: (sent: Sent) => void;
};

function FormSteps({
  token,
  network = false,
  prefillRoles,
  known,
  requester,
  onSent,
}: FormStepsProps) {
  const t = fr.legalForms;
  const [step, setStep] = useState<"roles" | "fields" | "review">("roles");
  const [roles, setRoles] = useState<FormRole[]>(prefillRoles);
  const [otherRole, setOtherRole] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>(known);
  const [error, setError] = useState<string | null>(null);
  const [flagged, setFlagged] = useState<string[]>([]);
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
        onSent({ status: result.status, sentAt: new Date().toISOString() });
      } else {
        setError(result.error);
        const flags = [...(result.missing ?? []), ...(result.invalid ?? [])];
        setFlagged(flags);
        // A field to fix: back to the fields, with it in red.
        if (flags.length > 0) setStep("fields");
      }
    });

  if (step === "roles")
    return (
      <RoleStep
        roles={roles}
        otherRole={otherRole}
        network={network}
        onToggle={toggle}
        onOtherRole={setOtherRole}
        onNext={() => setStep("fields")}
      />
    );

  const fields = fieldsFor(roles, { network });
  // Required: the fiche's own, and what the contract needs (an address for
  // a person, the company's details for a company, the IPI for a creator).
  const needed = new Set(ficheNeeded(roles, answers));
  const isRequired = (id: string, base?: boolean) =>
    Boolean(base) || needed.has(id);
  if (step === "review")
    return (
      <FormReview
        roles={roles}
        otherRole={otherRole}
        fields={fields}
        answers={answers}
        organization={requester.organization}
        pending={pending}
        error={error}
        onBack={() => setStep("fields")}
        onSend={submit}
      />
    );
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
              const hint =
                [
                  t.fieldHints[field.id],
                  known[field.id] ? t.public.known : null,
                ]
                  .filter(Boolean)
                  .join(" ") || undefined;
              const err = flagged.includes(field.id)
                ? isRequired(field.id, field.required) && !answers[field.id]
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
                    required={isRequired(field.id, field.required)}
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
                    aria-required={
                      isRequired(field.id, field.required) || undefined
                    }
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
                  aria-required={
                    isRequired(field.id, field.required) || undefined
                  }
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
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        {/* The only secondary gesture: outlined, never text alone (Sacha,
            06/11/2026, docs/DESIGN.md « Bouton secondaire »). */}
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={pending}
          onClick={() => setStep("roles")}
        >
          {t.public.back}
        </Button>
        <Button
          type="button"
          size="lg"
          onClick={() => {
            setError(null);
            setStep("review");
          }}
        >
          {t.public.review.next}
        </Button>
      </div>
    </div>
  );
}
