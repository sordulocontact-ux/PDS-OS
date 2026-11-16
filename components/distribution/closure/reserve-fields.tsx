"use client";

import { Field } from "@/components/auth/field";
import { OptionSelect } from "@/components/projects/option-select";
import { ChipChoice } from "@/components/ui/chip-choice";
import {
  CRITICALITIES,
  type Criticality,
  type Reserve,
  type ReserveCause,
} from "@/lib/distribution/closure";
import { distribution } from "@/lib/i18n/fr/distribution";
import { distributionJourney } from "@/lib/i18n/fr/distribution-journey";

const fr = { distribution, distributionJourney };

const t = fr.distributionJourney.closure;
const c = fr.distribution.closure;

export type ReserveDraft = {
  cause: ReserveCause;
  ownerPersonId: string;
  dueOn: string;
  expectedProof: string;
  criticality: Criticality;
};

/** What PDS OS proposes for a reserve: the project's owner follows it, the
 * proof that lifts a reserve of this cause, the criticality of its cause. */
export const draftOf = (
  reserve: Reserve,
  ownerPersonId: string | null,
): ReserveDraft => ({
  cause: reserve.cause,
  ownerPersonId: ownerPersonId ?? "",
  dueOn: "",
  expectedProof: c.expectedProofs[reserve.cause],
  criticality: reserve.criticality,
});

/** Why a draft is not complete yet, per field (shown after a first try). */
export function draftErrors(draft: ReserveDraft, today: string) {
  return {
    owner: draft.ownerPersonId ? undefined : t.reserveOwnerRequired,
    due: draft.dueOn && draft.dueOn >= today ? undefined : t.reserveDueRequired,
    proof: draft.expectedProof.trim() ? undefined : t.reserveProofRequired,
  };
}

/**
 * One reserve of a closure being proposed (recette DIST-007): its label and
 * detail, then who follows it (a member), by when, the proof that will lift
 * it and its criticality — each prefilled when PDS OS knows it.
 */
export function ReserveFields({
  reserve,
  draft,
  members,
  today,
  tried,
  onChange,
}: {
  reserve: Reserve;
  draft: ReserveDraft;
  members: Array<{ personId: string; name: string }>;
  today: string;
  tried: boolean;
  onChange: (draft: ReserveDraft) => void;
}) {
  const errors = draftErrors(draft, today);
  const key = reserve.cause;
  return (
    <fieldset className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[color:var(--border-hairline)] bg-card p-3.5 modern:p-4">
      <legend className="px-1 font-semibold">{reserve.label}</legend>
      <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
        {reserve.details.join(" · ")}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <OptionSelect
          name={`reserve-owner-${key}`}
          label={t.reserveOwner}
          required
          items={Object.fromEntries(members.map((m) => [m.personId, m.name]))}
          defaultValue={draft.ownerPersonId || null}
          onValueChange={(value) =>
            onChange({ ...draft, ownerPersonId: value })
          }
          error={tried ? errors.owner : undefined}
        />
        <Field
          name={`reserve-due-${key}`}
          label={t.reserveDue}
          type="date"
          required
          min={today}
          value={draft.dueOn}
          onChange={(e) => onChange({ ...draft, dueOn: e.target.value })}
          error={tried ? errors.due : undefined}
        />
      </div>
      <Field
        name={`reserve-proof-${key}`}
        label={t.reserveProof}
        required
        maxLength={500}
        value={draft.expectedProof}
        onChange={(e) => onChange({ ...draft, expectedProof: e.target.value })}
        error={tried ? errors.proof : undefined}
      />
      <ChipChoice
        name={`reserve-criticality-${key}`}
        legend={t.reserveCriticality}
        required
        options={CRITICALITIES.map((value) => ({
          value,
          label: c.criticalities[value],
        }))}
        value={draft.criticality}
        onChange={(value) =>
          value && onChange({ ...draft, criticality: value })
        }
      />
    </fieldset>
  );
}
