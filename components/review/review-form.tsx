"use client";

import { useState, useTransition, type FormEvent } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { projectReview } from "@/lib/i18n/fr/production";
import { saveReview } from "@/lib/review/actions";
import type { ReviewText } from "@/lib/review/queries";

const fr = { projectReview };

const FIELDS = ["results", "worked", "improve"] as const;

/** The review, written by the owner while the closing runs; read-only
 * otherwise (empty parts are left out). */
export function ReviewForm({
  projectId,
  review,
  canEdit,
}: {
  projectId: string;
  review: ReviewText;
  canEdit: boolean;
}) {
  const t = fr.projectReview;
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    kind: "error" | "info";
    text: string;
  } | null>(null);

  if (!canEdit) {
    const parts = FIELDS.filter((key) => review[key].trim() !== "");
    if (parts.length === 0)
      return <p className="text-sm text-muted-foreground">{t.empty}</p>;
    return (
      <dl className="grid gap-4">
        {parts.map((key) => (
          <div key={key} className="grid gap-1">
            <dt className="text-sm text-muted-foreground">{t.fields[key]}</dt>
            <dd className="break-words whitespace-pre-line">{review[key]}</dd>
          </div>
        ))}
      </dl>
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setMessage(null);
    startTransition(async () => {
      const result = await saveReview({
        projectId,
        results: String(data.get("results") ?? ""),
        worked: String(data.get("worked") ?? ""),
        improve: String(data.get("improve") ?? ""),
      });
      setMessage(
        result.ok
          ? { kind: "info", text: t.saved }
          : { kind: "error", text: result.error },
      );
    });
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={submit}>
      <TextareaField
        name="results"
        label={t.fields.results}
        hint={t.fields.resultsHint}
        rows={4}
        maxLength={5000}
        defaultValue={review.results}
      />
      <TextareaField
        name="worked"
        label={t.fields.worked}
        rows={3}
        maxLength={5000}
        defaultValue={review.worked}
      />
      <TextareaField
        name="improve"
        label={t.fields.improve}
        rows={3}
        maxLength={5000}
        defaultValue={review.improve}
      />
      {message && <FormMessage kind={message.kind}>{message.text}</FormMessage>}
      <div>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {pending ? t.saving : t.save}
        </Button>
      </div>
    </form>
  );
}
