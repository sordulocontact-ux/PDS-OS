"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import { arbitrateReserve } from "@/lib/marketing/closure/reserve-actions";
import type { ReserveDecision } from "@/lib/marketing/closure/reserves";

const t = fr.reviewJourney.reserves;
const NONE = "none";

type Errors = Partial<
  Record<"person" | "due" | "channel" | "dup" | "reason", string>
>;

/**
 * « Arbitrer » under a reserve (proto `bi2`): the decision, then what it
 * needs — who follows, by when and through which channel for a follow-up
 * (ticket), the reserve kept for a duplicate, a reason for a definitive
 * limit or « non applicable » (ticket). The decisions are the viewer's own
 * (the direction accepts a limit). Errors at the first try, never a
 * disabled button.
 */
export function ReserveArbitrateInline({
  projectId,
  reserveId,
  decisions,
  members,
  others,
  defaults,
}: {
  projectId: string;
  reserveId: string;
  decisions: readonly ReserveDecision[];
  members: { personId: string; name: string }[];
  others: { id: string; label: string }[];
  defaults: { personId: string | null; dueOn: string };
}) {
  const [decision, setDecision] = useState<ReserveDecision>(decisions[0]);
  const [errors, setErrors] = useState<Errors>({});
  const { pending, error, run } = useWriteSubmit(
    () => setErrors({}),
    t.arbitrated,
  );
  const id = (key: string) => `arb-${reserveId}-${key}`;

  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const text = (key: string) => String(data.get(key) ?? "").trim();
        const pick = (key: string) => (text(key) === NONE ? "" : text(key));
        const follow = decision === "follow_up";
        const next: Errors = {
          person: follow && !pick("person") ? t.errors.person : undefined,
          due: follow && !text("dueOn") ? t.errors.due : undefined,
          channel: follow && !text("channel") ? t.errors.channel : undefined,
          dup:
            decision === "duplicate" && !pick("duplicateOf")
              ? t.errors.duplicate
              : undefined,
          reason:
            decision === "accepted_limit" && !text("reason")
              ? t.errors.limit
              : decision === "not_applicable" && !text("reason")
                ? t.errors.notApplicable
                : undefined,
        };
        setErrors(next);
        const first = (
          ["person", "due", "channel", "dup", "reason"] as const
        ).find((k) => next[k]);
        if (first) {
          document.getElementById(id(first))?.focus();
          return;
        }
        run(() =>
          arbitrateReserve({
            projectId,
            reserveId,
            decision,
            reason: text("reason"),
            followUpPersonId: follow ? pick("person") : "",
            followUpDueOn: follow ? text("dueOn") : "",
            followUpChannel: follow ? text("channel") : "",
            duplicateOf: decision === "duplicate" ? pick("duplicateOf") : "",
          }),
        );
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <OptionSelect
          id={id("decision")}
          name="decision"
          label={t.decision}
          items={Object.fromEntries(decisions.map((d) => [d, t.decisions[d]]))}
          defaultValue={decision}
          onValueChange={(v) => setDecision(v as ReserveDecision)}
        />
        {decision === "duplicate" && (
          <OptionSelect
            id={id("dup")}
            name="duplicateOf"
            label={t.duplicateOf}
            required
            items={{
              [NONE]: t.choose,
              ...Object.fromEntries(others.map((o) => [o.id, o.label])),
            }}
            defaultValue={NONE}
            error={errors.dup}
          />
        )}
        {decision === "follow_up" && (
          <>
            <OptionSelect
              id={id("person")}
              name="person"
              label={t.person}
              required
              items={{
                [NONE]: t.choose,
                ...Object.fromEntries(members.map((m) => [m.personId, m.name])),
              }}
              defaultValue={defaults.personId ?? NONE}
              error={errors.person}
            />
            <Field
              id={id("due")}
              name="dueOn"
              type="date"
              label={t.dueOn}
              required
              defaultValue={defaults.dueOn}
              error={errors.due}
            />
            <Field
              id={id("channel")}
              name="channel"
              label={t.channel}
              placeholder={t.channelPlaceholder}
              required
              maxLength={200}
              error={errors.channel}
            />
          </>
        )}
        <Field
          id={id("reason")}
          name="reason"
          label={t.reason}
          placeholder={t.reasonPlaceholder}
          required={
            decision === "accepted_limit" || decision === "not_applicable"
          }
          maxLength={1000}
          error={errors.reason}
        />
      </div>
      <FormMessage kind="error">{error}</FormMessage>
      <div>
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {t.arbitrate}
        </Button>
      </div>
    </form>
  );
}
