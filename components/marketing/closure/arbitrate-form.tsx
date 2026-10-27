"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { marketingReview } from "@/lib/i18n/fr/marketing-review";
import { arbitrateReserve } from "@/lib/marketing/closure/reserve-actions";
import type { ReserveDecision } from "@/lib/marketing/closure/reserves";

const fr = { marketingReview };

const t = fr.marketingReview.closure.reserves;
const NONE = "none";

/**
 * « Arbitrer la réserve » (écran 4): one decision and what it requires —
 * who, by when and the channel for a follow-up; a reason for a definitive
 * limit or « non applicable »; the reserve kept for a duplicate. The
 * decisions offered are the viewer's own (the direction accepts limits).
 */
export function ArbitrateForm({
  projectId,
  reserveId,
  decisions,
  current,
  members,
  others,
  onDone,
}: {
  projectId: string;
  reserveId: string;
  decisions: readonly ReserveDecision[];
  current: {
    decision: ReserveDecision | null;
    reason: string | null;
    personId: string | null;
    dueOn: string | null;
    channel: string | null;
  };
  members: { personId: string; name: string }[];
  // The reserves a duplicate can point to.
  others: { id: string; label: string }[];
  onDone: () => void;
}) {
  const [decision, setDecision] = useState<ReserveDecision>(
    current.decision && decisions.includes(current.decision)
      ? current.decision
      : decisions[0],
  );
  const { pending, error, run } = useWriteSubmit(onDone, t.saved);
  const needsReason =
    decision === "accepted_limit" || decision === "not_applicable";

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const text = (key: string) => String(data.get(key) ?? "");
        const pick = (key: string) => (text(key) === NONE ? "" : text(key));
        run(() =>
          arbitrateReserve({
            projectId,
            reserveId,
            decision,
            reason: text("reason"),
            followUpPersonId: decision === "follow_up" ? pick("person") : "",
            followUpDueOn: decision === "follow_up" ? text("dueOn") : "",
            followUpChannel: decision === "follow_up" ? text("channel") : "",
            duplicateOf: decision === "duplicate" ? pick("duplicateOf") : "",
          }),
        );
      }}
    >
      <ChoiceCards
        name="decision"
        legend={t.decision}
        value={decision}
        onChange={setDecision}
        choices={decisions.map((d) => ({
          value: d,
          label: t.decisions[d],
          hint: t.decisionHints[d],
        }))}
      />
      {decision === "follow_up" && (
        <>
          <OptionSelect
            id={`arbitrate-${reserveId}-person`}
            name="person"
            label={t.followUpPerson}
            required
            items={{
              [NONE]: t.choosePerson,
              ...Object.fromEntries(members.map((m) => [m.personId, m.name])),
            }}
            defaultValue={current.personId ?? NONE}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id={`arbitrate-${reserveId}-due`}
              name="dueOn"
              type="date"
              label={t.followUpDue}
              required
              defaultValue={current.dueOn ?? ""}
            />
            <Field
              id={`arbitrate-${reserveId}-channel`}
              name="channel"
              label={t.followUpChannel}
              placeholder={t.channelPlaceholder}
              required
              maxLength={200}
              defaultValue={current.channel ?? ""}
            />
          </div>
        </>
      )}
      {decision === "duplicate" && (
        <OptionSelect
          id={`arbitrate-${reserveId}-duplicate`}
          name="duplicateOf"
          label={t.duplicateOf}
          required
          items={{
            [NONE]: t.chooseReserve,
            ...Object.fromEntries(others.map((o) => [o.id, o.label])),
          }}
          defaultValue={NONE}
        />
      )}
      <TextareaField
        id={`arbitrate-${reserveId}-reason`}
        name="reason"
        label={t.reason}
        hint={needsReason ? t.reasonRequired : undefined}
        aria-required={needsReason || undefined}
        rows={2}
        maxLength={1000}
        defaultValue={current.reason ?? ""}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <DialogFormActions
        pending={pending}
        submitLabel={t.arbitrate}
        onCancel={onDone}
      />
    </form>
  );
}
