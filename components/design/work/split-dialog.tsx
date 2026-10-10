"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useState } from "react";

import { useDesignAction } from "@/components/design/work/use-design-action";
import { OptionSelect } from "@/components/framing/option-select";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { splitDesignIntention } from "@/lib/design/actions/consolidation";
import { fr } from "@/lib/i18n/fr";

type Part = { key: number; target: string; topic: string; value: string };

const MAX_PARTS = 10;

/**
 * « Dissocier »: one proposal becomes two to ten, each with its target and
 * topic; all keep the same source (split_from).
 */
export function SplitDialog({
  projectId,
  open,
  onOpenChange,
  proposal,
  targets,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: { id: string; value: string; topic: string; target: string };
  targets: Record<string, string>;
}) {
  const t = fr.conceptionIntents.split;
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.title}
      description={t.body}
      closeLabel={fr.conceptionIntents.consolidation.close}
      size="wide"
    >
      <SplitForm
        projectId={projectId}
        proposal={proposal}
        targets={targets}
        onDone={() => onOpenChange(false)}
      />
    </FormDialog>
  );
}

function SplitForm({
  projectId,
  proposal,
  targets,
  onDone,
}: {
  projectId: string;
  proposal: { id: string; value: string; topic: string; target: string };
  targets: Record<string, string>;
  onDone: () => void;
}) {
  const t = fr.conceptionIntents.split;
  const { pending, run } = useDesignAction();
  const first = { target: proposal.target, topic: proposal.topic };
  const [parts, setParts] = useState<Part[]>([
    { key: 1, ...first, value: proposal.value },
    { key: 2, ...first, value: "" },
  ]);
  const update = (key: number, patch: Partial<Part>) =>
    setParts((all) => all.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  const complete = parts.every((p) => p.value.trim() && p.target);

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () =>
            splitDesignIntention(
              projectId,
              proposal.id,
              parts.map(({ target, topic, value }) => ({
                target,
                topic,
                value,
              })),
            ),
          { success: t.done, onSuccess: onDone },
        );
      }}
    >
      {parts.map((part, index) => (
        <fieldset key={part.key} className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <legend className="text-body-md font-medium">
              {t.part(index + 1)}
            </legend>
            {parts.length > 2 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setParts((all) => all.filter((p) => p.key !== part.key))
                }
              >
                {t.remove}
              </Button>
            )}
          </div>
          <Label htmlFor={`split-value-${part.key}`} className="sr-only">
            {t.valueLabel}
          </Label>
          <Textarea
            id={`split-value-${part.key}`}
            rows={2}
            maxLength={2000}
            value={part.value}
            onChange={(e) => update(part.key, { value: e.target.value })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <OptionSelect
              id={`split-target-${part.key}`}
              label={t.targetLabel}
              options={targets}
              value={part.target}
              onChange={(target) => update(part.key, { target })}
              required
            />
            <OptionSelect
              id={`split-topic-${part.key}`}
              label={t.topicLabel}
              options={fr.conception.topics}
              value={part.topic}
              onChange={(topic) => update(part.key, { topic })}
            />
          </div>
        </fieldset>
      ))}
      {parts.length < MAX_PARTS && (
        <Button
          type="button"
          variant="ghost"
          className="self-start"
          onClick={() =>
            setParts((all) => [
              ...all,
              {
                key: Math.max(...all.map((p) => p.key)) + 1,
                ...first,
                value: "",
              },
            ])
          }
        >
          <IconPlus aria-hidden data-icon="inline-start" />
          {t.add}
        </Button>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onDone}>
          {fr.conceptionIntents.consolidation.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending || !complete}>
          {pending ? t.submitting : t.submit}
        </Button>
      </div>
    </form>
  );
}
