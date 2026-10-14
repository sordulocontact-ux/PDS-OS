"use client";

import { useState, useTransition } from "react";

import { ChoiceCards } from "@/components/ui/choice-cards";
import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { editFeedbackTopic, proposeTopicRewrite } from "@/lib/feedback/actions";
import {
  FEEDBACK_KINDS,
  TOPIC_SUMMARY_MAX,
  TOPIC_TITLE_MAX,
  type FeedbackKind,
  type FeedbackTopic,
} from "@/lib/feedback/types";
import { fr } from "@/lib/i18n/fr";

// The director's edit of a topic before sending it: title, summary, kind.
// PO can propose a rewrite from the original feedback and an optional
// request; its text lands in the fields, to be read, changed and saved by
// the director. Nothing is written before "Enregistrer".
// `topic` holds the values to start from: the saved ones, or PO's draft.
export function TopicEditForm({
  topic,
  onSaved,
  onCancel,
}: {
  topic: Pick<FeedbackTopic, "id" | "kind" | "title" | "summary">;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const t = fr.feedback.edit;
  const [kind, setKind] = useState<FeedbackKind>(topic.kind);
  const [title, setTitle] = useState(topic.title);
  const [summary, setSummary] = useState(topic.summary);
  const [request, setRequest] = useState("");
  const [proposal, setProposal] = useState<"done" | { error: string } | null>(
    null,
  );
  const [errors, setErrors] = useState<{ title?: string; summary?: string }>(
    {},
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [rewriting, startRewrite] = useTransition();
  const [saving, startSave] = useTransition();

  const rewrite = () =>
    startRewrite(async () => {
      const result = await proposeTopicRewrite(topic.id, request);
      if (!result.ok) {
        setProposal({
          error: result.error === "quota" ? result.message : t.rewrite.failed,
        });
        return;
      }
      setTitle(result.title);
      setSummary(result.summary);
      setProposal("done");
    });

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    startSave(async () => {
      const result = await editFeedbackTopic({
        topicId: topic.id,
        kind,
        title,
        summary,
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        if (!result.fieldErrors) setFormError(t.errors.generic);
        return;
      }
      onSaved();
    });
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/40 p-3">
        <Field
          name="request"
          label={t.rewrite.label}
          hint={t.rewrite.hint}
          placeholder={t.rewrite.placeholder}
          maxLength={500}
          value={request}
          onChange={(event) => setRequest(event.target.value)}
          onKeyDown={(event) => {
            // Enter asks PO, it never saves the form.
            if (event.key === "Enter") {
              event.preventDefault();
              if (!rewriting) rewrite();
            }
          }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={rewriting || saving}
            aria-busy={rewriting || undefined}
            onClick={rewrite}
          >
            {rewriting ? t.rewrite.pending : t.rewrite.submit}
          </Button>
          <p role="status" className="text-sm text-muted-foreground">
            {proposal === "done" && t.rewrite.done}
          </p>
        </div>
        {proposal && proposal !== "done" && (
          <FormMessage kind="error">{proposal.error}</FormMessage>
        )}
      </div>

      <Field
        name="title"
        label={t.topicTitle}
        required
        maxLength={TOPIC_TITLE_MAX}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        error={errors.title}
      />
      <TextareaField
        name="summary"
        label={t.summary}
        required
        rows={5}
        maxLength={TOPIC_SUMMARY_MAX}
        value={summary}
        onChange={(event) => setSummary(event.target.value)}
        error={errors.summary}
      />
      <ChoiceCards
        name="kind"
        legend={t.kind}
        required
        choices={FEEDBACK_KINDS.map((k) => ({
          value: k,
          label: fr.feedback.kinds[k],
          hint: fr.feedback.kindHints[k],
        }))}
        value={kind}
        onChange={setKind}
      />

      {formError && <FormMessage kind="error">{formError}</FormMessage>}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={saving || rewriting}
          aria-busy={saving || undefined}
        >
          {saving ? t.saving : t.save}
        </Button>
      </div>
    </form>
  );
}
