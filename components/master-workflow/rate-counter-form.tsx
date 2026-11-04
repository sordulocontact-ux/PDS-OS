"use client";

import { useState, useTransition } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { masterRound } from "@/lib/i18n/fr/master-round";
import { proposeMasterRate } from "@/lib/master-workflow/transmission-public-actions";
import { parseEurosToCents } from "@/lib/projects/schemas";

const fr = { masterRound };

const t = fr.masterRound.take;

/**
 * « Proposer ce montant » on the engineer's link, under the label's
 * refusal of their rate (Sacha, 04/11): one amount for the refused role;
 * the label accepts or refuses it again.
 */
export function RateCounterForm({
  token,
  role,
}: {
  token: string;
  role: "mix" | "mastering";
}) {
  const [amount, setAmount] = useState("");
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const cents = parseEurosToCents(amount);
  const invalid = cents === null || cents === undefined;
  return (
    <form
      noValidate
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (invalid) return;
        start(async () => {
          const result = await proposeMasterRate(token, role, cents);
          if (!result.ok) return setError(result.error);
          setError(null);
          toast.success(`${t.countered}.`);
        });
      }}
    >
      <Field
        name={`counter-${role}`}
        label={t.amount(role)}
        inputMode="decimal"
        required
        value={amount}
        error={tried && invalid ? t.errors.amount : undefined}
        onChange={(e) => setAmount(e.target.value)}
        className="w-40"
      />
      <Button type="submit" disabled={pending}>
        {t.counter}
      </Button>
      <FormMessage kind="error" className="w-full">
        {error}
      </FormMessage>
    </form>
  );
}
