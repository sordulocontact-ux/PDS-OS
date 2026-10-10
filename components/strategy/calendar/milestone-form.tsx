"use client";

import { useState } from "react";

import { OptionSelect } from "@/components/framing/option-select";
import { labelClass } from "@/components/strategy/option-class";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fr } from "@/lib/i18n/fr";
import type { MilestoneInput } from "@/lib/strategy/actions/plan";
import {
  addDays,
  channelOfKind,
  dayOffset,
  parseRelativeDay,
  type MilestoneChannel,
} from "@/lib/strategy/calendar";
import type { Milestone, StrategyData } from "@/lib/strategy/queries";

const NONE = "none";
type Kind = keyof typeof fr.strategy.calendar.kinds;

const relativeLabel = (days: number) =>
  days === 0 ? "J0" : days < 0 ? `J${days}` : `J+${days}`;

/**
 * A milestone typed by a person: its day relative to the release (« J-10 »,
 * turned into a date by code) or a plain date, its kind, its channel, the
 * deliverable that comes out that day and a note.
 */
export function MilestoneForm({
  milestone,
  referenceDate,
  deliverables,
  pending,
  onSubmit,
  onRemove,
}: {
  milestone: Milestone | null;
  referenceDate: string | null;
  deliverables: StrategyData["deliverables"];
  pending: boolean;
  onSubmit: (input: MilestoneInput) => void;
  onRemove?: () => void;
}) {
  const t = fr.strategyCalendar.dialog;
  const kinds = fr.strategy.calendar.kinds;
  const [title, setTitle] = useState(milestone?.title ?? "");
  const [date, setDate] = useState(milestone?.occurs_on ?? "");
  const [relative, setRelative] = useState(
    milestone && referenceDate
      ? relativeLabel(dayOffset(milestone.occurs_on, referenceDate))
      : "",
  );
  const [kind, setKind] = useState<Kind>(
    (milestone?.kind as Kind) ?? "announcement",
  );
  const [channel, setChannel] = useState<MilestoneChannel>(
    (milestone?.channel as MilestoneChannel) ?? channelOfKind("announcement"),
  );
  // Until the channel is picked by hand, it follows the kind.
  const [channelTouched, setChannelTouched] = useState(milestone !== null);
  const [deliverable, setDeliverable] = useState(
    milestone?.deliverable_id ?? NONE,
  );
  const [notes, setNotes] = useState(milestone?.notes ?? "");
  const relativeDays = parseRelativeDay(relative);
  const relativeInvalid = relative.trim() !== "" && relativeDays === null;

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          title,
          occursOn: date,
          kind,
          channel,
          deliverableId: deliverable === NONE ? "" : deliverable,
          notes,
        });
      }}
    >
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor="milestone-title" required className={labelClass}>
          {t.title}
        </Label>
        <Input
          id="milestone-title"
          aria-required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      {referenceDate && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="milestone-relative" className={labelClass}>
            {t.relative}
          </Label>
          <Input
            id="milestone-relative"
            value={relative}
            placeholder={t.relativePlaceholder}
            aria-describedby="milestone-relative-hint"
            aria-invalid={relativeInvalid || undefined}
            className="tabular-nums"
            onChange={(e) => {
              setRelative(e.target.value);
              const days = parseRelativeDay(e.target.value);
              if (days !== null) setDate(addDays(referenceDate, days));
            }}
          />
          <p
            id="milestone-relative-hint"
            className="text-caption text-muted-foreground"
          >
            {relativeInvalid ? t.relativeInvalid : t.relativeHint}
          </p>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="milestone-date" required className={labelClass}>
          {t.date}
        </Label>
        <Input
          id="milestone-date"
          aria-required
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            if (referenceDate && e.target.value)
              setRelative(
                relativeLabel(dayOffset(e.target.value, referenceDate)),
              );
          }}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="milestone-kind" required className={labelClass}>
          {t.kind}
        </Label>
        <OptionSelect
          id="milestone-kind"
          required
          label={t.kind}
          options={kinds}
          value={kind}
          onChange={(v) => {
            setKind(v as Kind);
            if (!channelTouched) setChannel(channelOfKind(v));
          }}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="milestone-channel" required className={labelClass}>
          {t.channel}
        </Label>
        <OptionSelect
          id="milestone-channel"
          required
          label={t.channel}
          options={fr.strategyCalendar.channels}
          value={channel}
          onChange={(v) => {
            setChannel(v as MilestoneChannel);
            setChannelTouched(true);
          }}
        />
      </div>
      {deliverables.length > 0 && (
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="milestone-deliverable" className={labelClass}>
            {t.deliverable}
          </Label>
          <OptionSelect
            id="milestone-deliverable"
            label={t.deliverable}
            options={{
              [NONE]: t.noDeliverable,
              ...Object.fromEntries(deliverables.map((d) => [d.id, d.title])),
            }}
            value={deliverable}
            onChange={setDeliverable}
          />
          <p className="text-caption text-muted-foreground">
            {t.deliverableHint}
          </p>
        </div>
      )}
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor="milestone-notes" className={labelClass}>
          {t.notes}
        </Label>
        <Textarea
          id="milestone-notes"
          rows={3}
          maxLength={1000}
          value={notes}
          placeholder={t.notesPlaceholder}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
        {onRemove ? (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={onRemove}
          >
            {t.remove}
          </Button>
        ) : (
          <span />
        )}
        <Button
          type="submit"
          disabled={
            pending || title.trim() === "" || date === "" || relativeInvalid
          }
        >
          {pending ? t.saving : milestone ? t.save : t.add}
        </Button>
      </div>
    </form>
  );
}
