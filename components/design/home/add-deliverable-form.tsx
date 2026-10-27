"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FieldError } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { addDesignDeliverable } from "@/lib/design/actions/home";
import { ADDITION_ORIGINS, type AdditionOrigin } from "@/lib/design/intentions";
import { designSteps } from "@/lib/i18n/fr/design-steps";

const fr = { designSteps };

const t = fr.designSteps.home.form;

export type AddDeliverableDefaults = {
  title?: string;
  format?: string;
  origin?: AdditionOrigin;
  note?: string;
};

/**
 * « Ajouter un livrable » in place (proto `addliv`): Livrable *, Format,
 * Provenance (its call or its lever when it says so), Motif *; each missing
 * field in red with its reason at the first try. Added « à qualifier ».
 * `initial`: opened pre-filled (PO).
 */
export function AddDeliverableForm({
  projectId,
  calls,
  levers,
  initial = {},
  stay = false,
  onClose,
}: {
  projectId: string;
  calls: Array<{ id: string; title: string }>;
  levers: Array<{ id: string; label: string }>;
  initial?: AddDeliverableDefaults;
  stay?: boolean;
  onClose: () => void;
}) {
  const [origin, setOrigin] = useState<AdditionOrigin>(
    initial.origin ?? "manual",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { pending, error, run } = useWriteSubmit(
    stay ? () => undefined : onClose,
    "",
  );
  const submit = (form: HTMLFormElement) => {
    const data = new FormData(form);
    const value = (key: string) => String(data.get(key) ?? "").trim();
    const next: Record<string, string> = {};
    if (!value("title")) next.title = t.errors.name;
    if (!value("note")) next.note = t.errors.why;
    if (origin === "call" && !value("callId")) next.callId = t.errors.call;
    if (origin === "strategy_decision" && !value("leverId"))
      next.leverId = t.errors.lever;
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) {
      form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    run(() =>
      addDesignDeliverable({
        projectId,
        title: value("title"),
        format: value("format"),
        origin,
        callId: value("callId") || null,
        leverId: value("leverId") || null,
        note: value("note"),
      }),
    );
  };
  return (
    <form
      noValidate
      className="flex flex-col gap-3 rounded-xl bg-[var(--surface-soft)] p-3.5"
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          name="title"
          label={t.name}
          placeholder={t.namePlaceholder}
          defaultValue={initial.title}
          required
          error={errors.title}
          maxLength={200}
        />
        <Field
          name="format"
          label={t.format}
          placeholder={t.formatPlaceholder}
          defaultValue={initial.format}
          maxLength={200}
        />
        <OptionSelect
          name="origin"
          label={t.origin}
          items={Object.fromEntries(
            ADDITION_ORIGINS.map((o) => [o, t.origins[o]]),
          )}
          defaultValue={origin}
          onValueChange={(v) => setOrigin(v as AdditionOrigin)}
        />
        <Field
          name="note"
          label={t.why}
          placeholder={t.whyPlaceholder}
          defaultValue={initial.note}
          required
          error={errors.note}
          maxLength={1000}
        />
        {origin === "call" && (
          <OptionSelect
            name="callId"
            label={t.call}
            placeholder={t.callPlaceholder}
            items={Object.fromEntries(calls.map((c) => [c.id, c.title]))}
            required
            error={errors.callId}
          />
        )}
        {origin === "strategy_decision" && (
          <OptionSelect
            name="leverId"
            label={t.lever}
            placeholder={t.leverPlaceholder}
            items={Object.fromEntries(levers.map((l) => [l.id, l.label]))}
            required
            error={errors.leverId}
          />
        )}
      </div>
      <FieldError id="add-deliverable-error">{error ?? undefined}</FieldError>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending} aria-busy={pending}>
          {t.submit}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}
