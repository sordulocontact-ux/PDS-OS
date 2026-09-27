"use client";

import { useActionState, useEffect, useRef } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import {
  createContentFormat,
  type CreateContentFormatState,
} from "@/lib/projects/content-format-actions";
import type { ContentFormatOption } from "@/lib/projects/types";

const idle: CreateContentFormatState = { status: "idle" };

// "Nouveau format PDS", in a modal over the project form: the format is
// handed back and selected, the project form keeps its input.
export function ContentFormatForm({
  initialName,
  onCreated,
  onCancel,
}: {
  initialName: string;
  onCreated: (format: ContentFormatOption) => void;
  onCancel: () => void;
}) {
  const t = fr.shell.newProject.contentFormatForm;
  const [state, action] = useActionState(createContentFormat, idle);
  const values = state.status === "error" ? (state.values ?? {}) : {};
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const handled = useRef<unknown>(null);

  useEffect(() => {
    if (state.status !== "created" || handled.current === state) return;
    handled.current = state;
    onCreated(state.format);
    // onCreated changes identity on every render of the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      action={action}
      noValidate
      // The modal is portalled, but React bubbles the submit to the project
      // form behind, which would pause its draft.
      onSubmit={(event) => event.stopPropagation()}
      className="flex flex-col gap-5"
    >
      <Field
        id="format-name"
        name="name"
        label={t.name}
        required
        autoFocus
        autoComplete="off"
        maxLength={120}
        defaultValue={values.name ?? initialName}
        error={errors.name}
      />
      <TextareaField
        id="format-description"
        name="description"
        label={t.details}
        maxLength={2000}
        defaultValue={values.description ?? ""}
        error={errors.description}
      />
      {state.status === "error" && state.formError && (
        <FormMessage kind="error">{state.formError}</FormMessage>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          {t.cancel}
        </Button>
        <SubmitButton pendingLabel={t.submitting}>{t.submit}</SubmitButton>
      </div>
    </form>
  );
}
