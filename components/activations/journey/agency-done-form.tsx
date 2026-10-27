"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import {
  MemberSelect,
  memberValue,
} from "@/components/activations/member-select";
import { Button } from "@/components/ui/button";
import { Fold } from "@/components/ui/fold";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { declareDoneWithReserve } from "@/lib/activations/agency/done-actions";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";

const t = fr.activationJourney.gesture;
const ID = "agency-done";

type Errors = { reason?: string; who?: string; when?: string };

/**
 * « Déclarer réalisée avec une réserve » (recette of 23/10, MKT-ACT-001),
 * under the reason an agency campaign is not done yet: what remains, who
 * follows it, until when. Each missing field turns red at the first try, the
 * first takes the focus; the reserve goes to the bilan.
 */
export function AgencyDoneForm({
  ids,
  members,
  defaultPersonId,
  today,
}: {
  ids: { projectId: string; activationId: string };
  members: Member[];
  defaultPersonId: string | null;
  today: string;
}) {
  const [errors, setErrors] = useState<Errors>({});
  const { pending, error, run } = useWriteSubmit(undefined, "");
  return (
    <Fold summary={t.withReserve}>
      <form
        noValidate
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const reason = String(data.get("reason") ?? "").trim();
          const personId = memberValue(data, "who");
          const dueOn = String(data.get("when") ?? "");
          const next: Errors = {
            reason: reason ? undefined : t.reserveReasonRequired,
            who: personId ? undefined : t.reserveWhoRequired,
            when: !dueOn
              ? t.reserveWhenRequired
              : dueOn < today
                ? fr.activationJourney.errors.dueInPast
                : undefined,
          };
          setErrors(next);
          const first = (["reason", "who", "when"] as const).find(
            (k) => next[k],
          );
          if (first) {
            document
              .getElementById(first === "who" ? "who-select" : `${ID}-${first}`)
              ?.focus();
            return;
          }
          run(() =>
            declareDoneWithReserve({ ...ids, reason, personId, dueOn }),
          );
        }}
      >
        <TextareaField
          id={`${ID}-reason`}
          name="reason"
          label={t.reserveReason}
          placeholder={t.reserveReasonPlaceholder}
          required
          rows={2}
          maxLength={1000}
          error={errors.reason}
        />
        <MemberSelect
          name="who"
          label={t.reserveWho}
          members={members}
          defaultValue={defaultPersonId}
          required
          error={errors.who}
        />
        <Field
          id={`${ID}-when`}
          name="when"
          type="date"
          label={t.reserveWhen}
          required
          min={today}
          hint={t.reserveNote}
          error={errors.when}
        />
        <div>
          <Button type="submit" disabled={pending}>
            {t.withReserve}
          </Button>
        </div>
        {error && <FormMessage kind="error">{error}</FormMessage>}
      </form>
    </Fold>
  );
}
