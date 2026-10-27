"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Field } from "@/components/auth/field";
import { FieldError, FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { fr } from "@/lib/i18n/fr";
import { formatAmount } from "@/lib/utils/money";
import { takeMasterPackage } from "@/lib/master-workflow/transmission-public-actions";
import { parseEurosToCents } from "@/lib/projects/schemas";

const t = fr.masterRound.take;
type Stage = "mix" | "mastering";

/**
 * « Prendre en charge le dossier » on the engineer's link (proto): the rates
 * PDS estimated for the roles of the link, « Je confirme ce tarif » or « Je
 * propose un autre tarif » with the amounts; the label accepts them before
 * they count.
 */
export function TakeChargeForm({
  token,
  estimate,
}: {
  token: string;
  // Cents per role of the link; null: this link does not carry the role.
  estimate: Partial<Record<Stage, number | null>>;
}) {
  const roles = (Object.keys(estimate) as Stage[]).filter(
    (r) => estimate[r] !== undefined,
  );
  const known = roles.every((r) => estimate[r] !== null);
  const [choice, setChoice] = useState<"confirm" | "propose" | null>(
    known ? null : "propose",
  );
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const parsed = Object.fromEntries(
    roles.map((r) => [r, parseEurosToCents(amounts[r] ?? "")]),
  ) as Record<Stage, number | null | undefined>;
  const amountError = (r: Stage) =>
    choice === "propose" && (parsed[r] === undefined || parsed[r] === null)
      ? t.errors.amount
      : undefined;
  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (!choice || roles.some((r) => amountError(r))) return;
        start(async () => {
          const value = (r: Stage) =>
            choice === "propose" ? (parsed[r] ?? null) : null;
          const result = await takeMasterPackage(
            token,
            roles.includes("mix") ? value("mix") : null,
            roles.includes("mastering") ? value("mastering") : null,
          );
          if (!result.ok) return setError(result.error);
          toast.success(`${t.done}.`);
        });
      }}
    >
      {known ? (
        <div className="flex flex-col gap-0.5">
          {roles.map((r) => (
            <b key={r} className="font-semibold">
              {t.line(r, formatAmount(estimate[r] ?? 0))}
            </b>
          ))}
          <span className="text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
            {t.estimate}
          </span>
        </div>
      ) : (
        <p className="text-[length:var(--type-body-sm)]">{t.unknown}</p>
      )}
      {known && (
        <div className="flex flex-col gap-1.5">
          <ChoiceCards
            name={`take-${token.slice(0, 8)}`}
            legend={t.legend}
            hideLegend
            required
            variant="list"
            value={choice}
            onChange={setChoice}
            choices={[
              { value: "confirm", label: t.confirm },
              { value: "propose", label: t.propose },
            ]}
          />
          {tried && !choice && (
            <FieldError id="take-choice-error">{t.errors.choice}</FieldError>
          )}
        </div>
      )}
      {choice === "propose" &&
        roles.map((r) => (
          <Field
            key={r}
            name={`amount-${r}`}
            label={t.amount(r)}
            required
            inputMode="decimal"
            value={amounts[r] ?? ""}
            error={tried ? amountError(r) : undefined}
            onChange={(e) => setAmounts({ ...amounts, [r]: e.target.value })}
          />
        ))}
      <p className="text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
        {t.hint}
      </p>
      <FormMessage kind="error">{error}</FormMessage>
      <Button
        type="submit"
        className="self-start"
        disabled={pending}
        aria-busy={pending || undefined}
      >
        {t.button}
      </Button>
    </form>
  );
}
