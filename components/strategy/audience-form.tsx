"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toast";

import { Field } from "@/components/auth/field";
import { TextareaField } from "@/components/auth/textarea-field";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { ChipChoice } from "@/components/ui/chip-choice";
import { saveAudience } from "@/lib/strategy/actions/audiences";
import type { StrategyAudience } from "@/lib/strategy/queries";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { strategyPilot } from "@/lib/i18n/fr/strategy-pilot";

const fr = { dialogs, strategyPilot };

type Priority = "primary" | "secondary";

/** One public's fields (MKT-S1-05): segment, priority, insight, channel. */
export function AudienceForm({
  projectId,
  audience,
  defaultSegment = "",
  onDone,
}: {
  projectId: string;
  audience: StrategyAudience | null;
  // A closed choice turned into a public (« Public actuel de l'artiste »).
  defaultSegment?: string;
  onDone: () => void;
}) {
  const t = fr.strategyPilot.audiences;
  const { pending, run } = useFramingAction();
  const [priority, setPriority] = useState<Priority>(
    audience?.priority === "secondary" ? "secondary" : "primary",
  );
  const [missing, setMissing] = useState(false);
  const prefix = audience ? `audience-${audience.id}` : "audience-new";

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const segment = String(form.get("segment") ?? "").trim();
        setMissing(!segment);
        if (!segment) return;
        run(
          () =>
            saveAudience(projectId, {
              id: audience?.id,
              segment,
              priority,
              insight: String(form.get("insight") ?? ""),
              channel: String(form.get("channel") ?? ""),
            }),
          () => {
            toast.success(t.saved);
            onDone();
          },
        );
      }}
    >
      <Field
        id={`${prefix}-segment`}
        name="segment"
        label={t.segment}
        hint={t.segmentHint}
        required
        maxLength={120}
        defaultValue={audience?.segment ?? defaultSegment}
        error={missing ? t.segmentRequired : undefined}
      />
      <ChipChoice
        name="priority"
        legend={t.priority}
        options={(["primary", "secondary"] as const).map((value) => ({
          value,
          label: t.priorities[value],
        }))}
        value={priority}
        onChange={(value) => value && setPriority(value)}
      />
      <TextareaField
        id={`${prefix}-insight`}
        name="insight"
        label={t.insight}
        hint={t.insightHint}
        rows={2}
        maxLength={500}
        defaultValue={audience?.insight ?? ""}
      />
      <Field
        id={`${prefix}-channel`}
        name="channel"
        label={t.channel}
        hint={t.channelHint}
        maxLength={200}
        defaultValue={audience?.channel ?? ""}
      />
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" size="lg" onClick={onDone}>
          {fr.dialogs.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? fr.dialogs.saving : t.save}
        </Button>
      </div>
    </form>
  );
}
