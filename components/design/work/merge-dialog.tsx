"use client";

import { useState } from "react";

import { useDesignAction } from "@/components/design/work/use-design-action";
import { OptionSelect } from "@/components/framing/option-select";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { mergeDesignIntentions } from "@/lib/design/actions/consolidation";
import { conception } from "@/lib/i18n/fr/conception";
import { conceptionIntents } from "@/lib/i18n/fr/conception-intents";

const fr = { conception, conceptionIntents };

/**
 * « Fusionner »: the checked proposals become one, its words prefilled by
 * joining theirs (code), then reworded by the person. Their sources stay
 * traced (merged_into).
 */
export function MergeDialog({
  projectId,
  open,
  onOpenChange,
  proposals,
  target,
  targets,
  onDone,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposals: Array<{ id: string; value: string; topic: string }>;
  // Where they are: a deliverable id, « direction », or "" (to attach).
  target: string;
  targets: Record<string, string>;
  onDone: () => void;
}) {
  const t = fr.conceptionIntents.merge;
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.title}
      description={t.body}
      closeLabel={fr.conceptionIntents.consolidation.close}
    >
      <MergeForm
        projectId={projectId}
        proposals={proposals}
        target={target}
        targets={targets}
        onDone={onDone}
        onCancel={() => onOpenChange(false)}
      />
    </FormDialog>
  );
}

function MergeForm({
  projectId,
  proposals,
  target: initialTarget,
  targets,
  onDone,
  onCancel,
}: {
  projectId: string;
  proposals: Array<{ id: string; value: string; topic: string }>;
  target: string;
  targets: Record<string, string>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = fr.conceptionIntents.merge;
  const { pending, run } = useDesignAction();
  const [value, setValue] = useState(
    proposals.map((p) => p.value.trim().replace(/[.;]$/, "")).join(" ; "),
  );
  const [topic, setTopic] = useState(proposals[0]?.topic ?? "story");
  const [target, setTarget] = useState(initialTarget);

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () =>
            mergeDesignIntentions(
              projectId,
              proposals.map((p) => p.id),
              value,
              topic,
              target,
            ),
          { success: t.done, onSuccess: onDone },
        );
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="design-merge-value" required>
          {t.valueLabel}
        </Label>
        <Textarea
          id="design-merge-value"
          required
          rows={4}
          maxLength={2000}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="design-merge-topic">{t.topicLabel}</Label>
          <OptionSelect
            id="design-merge-topic"
            label={t.topicLabel}
            options={fr.conception.topics}
            value={topic}
            onChange={setTopic}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="design-merge-target" required>
            {t.targetLabel}
          </Label>
          <OptionSelect
            id="design-merge-target"
            label={t.targetLabel}
            options={targets}
            value={target}
            onChange={setTarget}
            required
          />
        </div>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          {fr.conceptionIntents.consolidation.cancel}
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={pending || !value.trim() || !target}
        >
          {pending ? t.submitting : t.submit}
        </Button>
      </div>
    </form>
  );
}
