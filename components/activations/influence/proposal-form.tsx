"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { ChipChoice } from "@/components/ui/chip-choice";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { recordProposal } from "@/lib/activations/influence/negotiation-actions";
import { activationInfluence } from "@/lib/i18n/fr/activation-influence";
import { activations } from "@/lib/i18n/fr/activations";

const fr = { activations, activationInfluence };

const t = fr.activationInfluence.negotiation;

/** « Noter une proposition » : PDS's offer or the creator's counter-offer,
 * structured ; kept as given. */
export function ProposalForm({
  projectId,
  activationId,
  targetId,
  onDone,
}: {
  projectId: string;
  activationId: string;
  targetId: string;
  onDone: () => void;
}) {
  const [party, setParty] = useState<"pds" | "creator">("pds");
  const [feeError, setFeeError] = useState(false);
  const { pending, error, run } = useWriteSubmit(onDone, t.recorded);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const raw = String(data.get("fee") ?? "")
          .replace(/\s/g, "")
          .replace(",", ".");
        const fee = raw === "" ? null : Number(raw);
        const bad = fee !== null && (!Number.isFinite(fee) || fee < 0);
        setFeeError(bad);
        if (bad) return;
        const text = (k: string) => String(data.get(k) ?? "");
        run(() =>
          recordProposal({
            projectId,
            activationId,
            targetId,
            party,
            fee,
            currency: (text("currency").trim().toUpperCase() || "EUR").slice(
              0,
              3,
            ),
            deliverables: text("deliverables"),
            schedule: text("schedule"),
            organicUsage: text("organic"),
            adsUsage: text("ads"),
            exclusivity: text("exclusivity"),
            expenses: text("expenses"),
            conditions: text("conditions"),
            note: text("note"),
          }),
        );
      }}
    >
      <ChipChoice
        name="party"
        legend={t.party}
        required
        value={party}
        onChange={(v) => setParty(v ?? "pds")}
        options={(["pds", "creator"] as const).map((p) => ({
          value: p,
          label: t.parties[p],
        }))}
      />
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <Field
          name="fee"
          label={t.fee}
          inputMode="decimal"
          error={
            feeError ? fr.activationInfluence.errors.amountInvalid : undefined
          }
        />
        <Field
          name="currency"
          label={t.currency}
          defaultValue="EUR"
          maxLength={3}
        />
      </div>
      <TextareaField
        name="deliverables"
        label={t.deliverables}
        rows={2}
        maxLength={2000}
      />
      <Field name="schedule" label={t.schedule} maxLength={1000} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextareaField
          name="organic"
          label={t.organicUsage}
          rows={2}
          maxLength={1000}
        />
        <TextareaField
          name="ads"
          label={t.adsUsage}
          rows={2}
          maxLength={1000}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="exclusivity" label={t.exclusivity} maxLength={1000} />
        <Field name="expenses" label={t.expenses} maxLength={1000} />
      </div>
      <TextareaField
        name="conditions"
        label={t.conditions}
        rows={2}
        maxLength={3000}
      />
      <Field name="note" label={t.note} maxLength={2000} />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {fr.activations.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? fr.activations.saving : t.add}
        </Button>
      </div>
    </form>
  );
}
