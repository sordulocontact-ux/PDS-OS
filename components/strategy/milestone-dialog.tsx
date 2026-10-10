"use client";

import { useState } from "react";

import { OptionSelect } from "@/components/framing/option-select";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { labelClass } from "@/components/strategy/option-class";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fr } from "@/lib/i18n/fr";
import { saveMilestone } from "@/lib/strategy/actions/calendar";
import type { Channel } from "@/lib/strategy/dimensions";
import type { Milestone, StrategyDeliverable } from "@/lib/strategy/queries";

type Kind = keyof typeof fr.strategy.calendar.kinds;
const NONE = "none";

/** A milestone opened to add or edit it: date, kind, channel, notes. */
export function MilestoneDialog({
  milestone,
  deliverables,
  projectId,
  open,
  onOpenChange,
}: {
  // null = a new milestone.
  milestone: Milestone | null;
  deliverables: StrategyDeliverable[];
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = fr.strategyFlow.calendar;
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={milestone ? t.editTitle : t.addTitle}
      description={t.dialogBody}
      closeLabel={t.close}
    >
      <MilestoneForm
        milestone={milestone}
        deliverables={deliverables}
        projectId={projectId}
        onDone={() => onOpenChange(false)}
      />
    </FormDialog>
  );
}

function MilestoneForm({
  milestone,
  deliverables,
  projectId,
  onDone,
}: {
  milestone: Milestone | null;
  deliverables: StrategyDeliverable[];
  projectId: string;
  onDone: () => void;
}) {
  const t = fr.strategyFlow.calendar;
  const tc = fr.strategy.calendar;
  const { pending, run } = useFramingAction();
  const [title, setTitle] = useState(milestone?.title ?? "");
  const [date, setDate] = useState(milestone?.occurs_on ?? "");
  const [kind, setKind] = useState<Kind>(
    (milestone?.kind as Kind) ?? "content",
  );
  const [channel, setChannel] = useState<Channel>(
    (milestone?.channel as Channel) ?? "organic",
  );
  const [deliverable, setDeliverable] = useState(
    milestone?.deliverable_id ?? NONE,
  );
  const [notes, setNotes] = useState(milestone?.notes ?? "");

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        run(
          () =>
            saveMilestone(projectId, milestone?.id ?? null, {
              title,
              occursOn: date,
              kind,
              channel,
              notes,
              deliverableId: deliverable === NONE ? "" : deliverable,
            }),
          onDone,
        );
      }}
    >
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor="milestone-title" className={labelClass}>
          {tc.name}
        </Label>
        <Input
          id="milestone-title"
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="milestone-date" className={labelClass}>
          {tc.date}
        </Label>
        <Input
          id="milestone-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="milestone-kind" className={labelClass}>
          {tc.kind}
        </Label>
        <OptionSelect
          id="milestone-kind"
          label={tc.kind}
          options={tc.kinds}
          value={kind}
          onChange={(v) => setKind(v as Kind)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="milestone-channel" className={labelClass}>
          {t.channel}
        </Label>
        <OptionSelect
          id="milestone-channel"
          label={t.channel}
          options={t.channels}
          value={channel}
          onChange={(v) => setChannel(v as Channel)}
        />
      </div>
      {deliverables.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="milestone-deliverable" className={labelClass}>
            {tc.deliverable}
          </Label>
          <OptionSelect
            id="milestone-deliverable"
            label={tc.deliverable}
            options={{
              [NONE]: tc.noDeliverable,
              ...Object.fromEntries(deliverables.map((d) => [d.id, d.title])),
            }}
            value={deliverable}
            onChange={setDeliverable}
          />
        </div>
      )}
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor="milestone-notes" className={labelClass}>
          {t.notes}
        </Label>
        <Textarea
          id="milestone-notes"
          value={notes}
          maxLength={1000}
          rows={3}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div className="flex justify-end sm:col-span-2">
        <Button
          type="submit"
          size="lg"
          disabled={pending || title.trim() === "" || date === ""}
        >
          {pending ? t.saving : t.save}
        </Button>
      </div>
    </form>
  );
}
