"use client";

import { useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useCloseProposalAdd } from "@/components/ui/proposal-group";
import { Textarea } from "@/components/ui/textarea";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { saveDesignIntention } from "@/lib/design/actions/intentions";
import { DESIGN_TOPICS, type DesignTopic } from "@/lib/design/intentions";
import { conception } from "@/lib/i18n/fr/conception";
import { designSteps } from "@/lib/i18n/fr/design-steps";

const fr = { conception, designSteps };

const t = fr.designSteps.intentions;

/**
 * « Ajouter une intention » of a group (proto `addForm` « design »): the
 * question, from the closed list of the group (direction or deliverable),
 * then the intention, confirmed as written by the person. `initial`: opened
 * pre-filled (PO).
 */
export function IntentionAddForm({
  projectId,
  deliverableId,
  initial,
}: {
  projectId: string;
  // Null: the release's direction.
  deliverableId: string | null;
  initial?: { topic?: DesignTopic; text?: string };
}) {
  const close = useCloseProposalAdd();
  const [topic, setTopic] = useState<DesignTopic>(initial?.topic ?? "story");
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(close, t.added);
  const labels = deliverableId
    ? fr.conception.topics
    : fr.conception.directionTopics;
  const id = `intention-${deliverableId ?? "direction"}`;
  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const text = String(
          new FormData(e.currentTarget).get("text") ?? "",
        ).trim();
        setMissing(!text);
        if (!text) return;
        run(() =>
          saveDesignIntention(projectId, deliverableId, topic, text, {
            choices: [],
            other: null,
          }),
        );
      }}
    >
      <OptionSelect
        name="topic"
        id={`${id}-topic`}
        label={t.question}
        items={Object.fromEntries(DESIGN_TOPICS.map((k) => [k, labels[k]]))}
        defaultValue={topic}
        onValueChange={(v) => setTopic(v as DesignTopic)}
      />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-text`} required>
          {t.intention}
        </Label>
        <Textarea
          id={`${id}-text`}
          name="text"
          rows={2}
          maxLength={2000}
          defaultValue={initial?.text}
          required
          aria-invalid={missing || undefined}
          aria-describedby={missing || error ? `${id}-error` : undefined}
        />
        <FieldError id={`${id}-error`}>
          {missing ? t.required : (error ?? undefined)}
        </FieldError>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending} aria-busy={pending}>
          {t.submit}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={close}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}
