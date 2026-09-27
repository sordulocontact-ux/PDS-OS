"use client";

import { useActionState } from "react";

import { ChoiceCards } from "@/components/calls/choice-cards";
import { FieldError, FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { TextareaField } from "@/components/auth/textarea-field";
import { sendFeedback } from "@/lib/feedback/actions";
import {
  FEEDBACK_KINDS,
  FEEDBACK_MESSAGE_MAX,
  idleFeedbackState,
  isFeedbackKind,
} from "@/lib/feedback/types";
import { fr } from "@/lib/i18n/fr";

// One feedback: its kind, the message, and the page it was opened from (sent
// along, so nobody has to describe where they were). After sending, the
// thanks stays above an empty form, ready for the next one.
export function FeedbackForm({ pagePath }: { pagePath: string | null }) {
  const [state, action] = useActionState(sendFeedback, idleFeedbackState);
  const t = fr.feedback;

  const values = state.status === "error" ? (state.values ?? {}) : {};
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const defaultKind = isFeedbackKind(values.kind) ? values.kind : undefined;
  const choices = FEEDBACK_KINDS.map((kind) => ({
    value: kind,
    label: t.kinds[kind],
    hint: t.kindHints[kind],
  }));

  return (
    <form
      key={state.status === "success" ? state.sentAt : "form"}
      action={action}
      noValidate
      className="flex flex-col gap-5"
    >
      {state.status === "success" && (
        <FormMessage kind="info">{t.success}</FormMessage>
      )}

      <div className="grid gap-1.5">
        <ChoiceCards
          key={defaultKind ?? ""}
          name="kind"
          legend={t.kind}
          choices={choices}
          defaultValue={defaultKind}
        />
        <FieldError id="kind-error">{errors.kind}</FieldError>
      </div>

      <TextareaField
        name="message"
        label={t.message}
        hint={t.messageHint}
        required
        rows={6}
        maxLength={FEEDBACK_MESSAGE_MAX}
        defaultValue={values.message ?? ""}
        error={errors.message}
      />

      {pagePath && (
        <p className="text-sm text-muted-foreground">
          {t.sentFrom}{" "}
          <span className="font-mono break-all text-foreground">
            {pagePath}
          </span>
          <input type="hidden" name="pagePath" value={pagePath} />
        </p>
      )}

      {state.status === "error" && !errors.kind && !errors.message && (
        <FormMessage kind="error">{state.error}</FormMessage>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-end">
        <SubmitButton pendingLabel={t.submitting}>{t.submit}</SubmitButton>
      </div>
    </form>
  );
}
