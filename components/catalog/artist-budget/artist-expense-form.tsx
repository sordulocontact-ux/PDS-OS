"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { OptionSelect } from "@/components/framing/option-select";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormMessage } from "@/components/auth/form-message";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { saveArtistExpense } from "@/lib/catalog/artist-expense-actions";
import {
  type ArtistExpense,
  type ArtistExpenseCategory,
  type ArtistExpenseStatus,
  isArtistExpenseCategory,
  isArtistExpenseStatus,
} from "@/lib/catalog/artist-expenses";
import { artistBudget } from "@/lib/i18n/fr/artist-budget";
import { amountInput, parseAmount } from "@/lib/utils/money";

const fr = { artistBudget };

/**
 * A spend of the artist, new (`expense` null) or edited: label, amount,
 * category (« Autre » asks a precision), date, Prévue or Payée, note.
 * Mounted per opening: the fields start from the saved values.
 */
export function ArtistExpenseForm({
  artistId,
  expense,
  today,
  onDone,
}: {
  artistId: string;
  expense: ArtistExpense | null;
  today: string;
  onDone: () => void;
}) {
  const t = fr.artistBudget.form;
  const { pending, run, error } = useFramingAction({ inline: true });
  const [category, setCategory] = useState<ArtistExpenseCategory>(
    expense?.category ?? "transport",
  );
  const [status, setStatus] = useState<ArtistExpenseStatus>(
    expense?.status ?? "paid",
  );
  const [spentOn, setSpentOn] = useState(expense?.spentOn ?? today);
  const [amountError, setAmountError] = useState(false);
  const [detailError, setDetailError] = useState(false);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = String(form.get("amount") ?? "");
    const detail = String(form.get("categoryDetail") ?? "").trim();
    const badAmount = !parseAmount(amount);
    const missingDetail = category === "other" && !detail;
    setAmountError(badAmount);
    setDetailError(missingDetail);
    if (badAmount || missingDetail) return;
    run(
      () =>
        saveArtistExpense(artistId, {
          id: expense?.id,
          label: String(form.get("label") ?? ""),
          amount,
          category,
          categoryDetail: detail,
          spentOn: spentOn || today,
          status,
          note: String(form.get("note") ?? ""),
        }),
      () => {
        toast.success(t.saved);
        onDone();
      },
    );
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <Field
        id="artist-expense-label"
        name="label"
        label={t.label}
        placeholder={t.labelPlaceholder}
        required
        maxLength={200}
        autoComplete="off"
        defaultValue={expense?.label ?? ""}
      />
      <Field
        id="artist-expense-amount"
        name="amount"
        label={t.amount}
        required
        inputMode="decimal"
        autoComplete="off"
        suffix="€"
        hint={t.amountHint}
        error={amountError ? t.invalidAmount : undefined}
        defaultValue={expense ? amountInput(expense.amountCents) : ""}
      />
      <div className="grid gap-1.5">
        <Label htmlFor="artist-expense-category" required>
          {t.category}
        </Label>
        <OptionSelect
          id="artist-expense-category"
          required
          label={t.category}
          options={fr.artistBudget.categories}
          value={category}
          onChange={(v) => isArtistExpenseCategory(v) && setCategory(v)}
        />
        <p className="text-caption text-muted-foreground">
          {fr.artistBudget.categoryHints[category]}
        </p>
      </div>
      {category === "other" && (
        <Field
          id="artist-expense-detail"
          name="categoryDetail"
          label={t.categoryDetail}
          aria-required
          maxLength={120}
          autoComplete="off"
          error={detailError ? t.categoryDetailMissing : undefined}
          defaultValue={expense?.categoryDetail ?? ""}
        />
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="artist-expense-date"
          name="spentOn"
          type="date"
          label={t.date}
          required
          value={spentOn}
          onChange={(event) => setSpentOn(event.target.value)}
        />
        <div className="grid content-start gap-1.5">
          <Label htmlFor="artist-expense-status" required>
            {t.status}
          </Label>
          <OptionSelect
            id="artist-expense-status"
            required
            label={t.status}
            options={fr.artistBudget.statuses}
            value={status}
            onChange={(v) => isArtistExpenseStatus(v) && setStatus(v)}
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="artist-expense-note">{t.note}</Label>
        <Textarea
          id="artist-expense-note"
          name="note"
          maxLength={1000}
          defaultValue={expense?.note ?? ""}
        />
      </div>
      <DialogFormActions
        pending={pending}
        submitLabel={t.submit}
        onCancel={onDone}
      />
    </form>
  );
}
