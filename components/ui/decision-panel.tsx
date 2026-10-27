"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { decisions } from "@/lib/i18n/fr/decisions";
import type { WriteResult } from "@/lib/utils/write-result";

const fr = { decisions };

const t = fr.decisions.decision;

export type DecisionOutcomeKind =
  | "approve"
  | "approve_reserves"
  | "request_changes"
  | "request_info"
  | "refuse";

export type DecisionOutcome = {
  kind: DecisionOutcomeKind;
  // The step's exact words (« Valider le Brief de sortie »); default:
  // fr.decisions.decision.outcomes.
  label?: string;
  // The toast, with the verb of the button (« Devis validé. »).
  done?: string;
};

/**
 * A validator's decision on a step (docs/VISION-UX.md rule 6, proto
 * « Votre décision »): a comment, then the outcomes the step offers —
 * Valider / Valider avec réserves / Demander une modification / Demander
 * une précision / Refuser — the main one first, on the left, then outline,
 * then ghost. Every outcome but « approve » needs the comment: tried
 * without it, the field turns red with its reason and takes the focus; no
 * button is ever disabled for it. `onDecide` is the module's Server Action.
 */
export function DecisionPanel({
  id = "decision",
  outcomes,
  onDecide,
  title = t.title,
  commentLabel = t.comment,
  commentHint = t.commentHint,
  commentPlaceholder,
  commentRequired = t.commentRequired,
  fields,
  check,
  onDone,
}: {
  id?: string;
  outcomes: DecisionOutcome[];
  onDecide: (kind: DecisionOutcomeKind, comment: string) => Promise<WriteResult>;
  // null: no heading (the step already says it).
  title?: string | null;
  commentLabel?: string;
  // null: no hint under the field.
  commentHint?: string | null;
  commentPlaceholder?: string;
  commentRequired?: string;
  // The step's own fields, above the comment (the Cadrage's « Dimensions à
  // revoir »).
  fields?: React.ReactNode;
  // Before deciding: false stops it (the step shows its own error).
  check?: (kind: DecisionOutcomeKind) => boolean;
  onDone?: () => void;
}) {
  const [comment, setComment] = useState("");
  const [missing, setMissing] = useState(false);
  // The outcome running: its button says so (« Validation en cours… »).
  const [deciding, setDeciding] = useState<DecisionOutcomeKind | null>(null);
  const { pending, error, run } = useWriteSubmit(
    () => {
      setComment("");
      onDone?.();
    },
    t.decided,
  );
  const fieldId = `${id}-comment`;

  const decide = (outcome: DecisionOutcome) => {
    const needs = outcome.kind !== "approve";
    const lacking = needs && !comment.trim();
    setMissing(lacking);
    const own = check ? check(outcome.kind) : true;
    if (!own) return;
    if (lacking) {
      document.getElementById(fieldId)?.focus();
      return;
    }
    setDeciding(outcome.kind);
    run(() => onDecide(outcome.kind, comment.trim()), outcome.done);
  };

  return (
    <div className="flex flex-col gap-3">
      {title && <h3 className="text-body-md font-semibold">{title}</h3>}
      {fields}
      <TextareaField
        id={fieldId}
        name="comment"
        label={commentLabel}
        hint={commentHint ?? undefined}
        placeholder={commentPlaceholder}
        rows={2}
        maxLength={2000}
        value={comment}
        onChange={(e) => {
          setComment(e.target.value);
          if (missing && e.target.value.trim()) setMissing(false);
        }}
        error={missing ? commentRequired : undefined}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <div className="flex flex-wrap gap-2">
        {outcomes.map((outcome, index) => (
          <Button
            key={outcome.kind}
            type="button"
            variant={index === 0 ? "default" : index === 1 ? "outline" : "ghost"}
            disabled={pending}
            aria-busy={(pending && deciding === outcome.kind) || undefined}
            onClick={() => decide(outcome)}
          >
            {pending && deciding === outcome.kind
              ? t.pending[outcome.kind]
              : (outcome.label ?? t.outcomes[outcome.kind])}
          </Button>
        ))}
      </div>
    </div>
  );
}
