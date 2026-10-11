"use client";

import { useState, type FormEvent } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { countryItems } from "@/lib/catalog/countries";
import { saveDossierParams } from "@/lib/distribution/actions";
import {
  PRICE_TIERS,
  TERRITORY_MODES,
  type DossierParams,
  type TerritoryMode,
} from "@/lib/distribution/dossier";
import { fr } from "@/lib/i18n/fr";

const t = fr.distribution.dossier;

type YesNoValue = "" | "yes" | "no";
const yesNoOf = (value: boolean | null): YesNoValue =>
  value === null ? "" : value ? "yes" : "no";

/** The distribution's own parameters (CA05), in the modal. */
export function DossierParamsForm({
  projectId,
  params,
  sheets,
  onDone,
}: {
  projectId: string;
  params: DossierParams;
  sheets: Array<{ id: string; label: string }>;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<TerritoryMode>(params.territoryMode);
  const [preorder, setPreorder] = useState<YesNoValue>(
    yesNoOf(params.preorder),
  );
  const [prelisten, setPrelisten] = useState<YesNoValue>(
    yesNoOf(params.prelisten),
  );
  const [countriesError, setCountriesError] = useState<string>();
  const { pending, error, run } = useWriteSubmit(onDone, t.params.saved);

  const yesNoChoices = [
    { value: "" as const, label: t.form.notSaid },
    { value: "yes" as const, label: t.yes },
    { value: "no" as const, label: t.no },
  ];

  function submit(event: FormEvent<HTMLFormElement>) {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    let territories: string[] = [];
    try {
      const raw: unknown = JSON.parse(String(data.get("territories") || "[]"));
      territories = Array.isArray(raw) ? raw.map(String) : [];
    } catch {
      territories = [];
    }
    if (mode !== "world" && territories.length === 0) {
      setCountriesError(t.form.countriesRequired);
      return;
    }
    setCountriesError(undefined);
    run(() =>
      saveDossierParams({
        projectId,
        territoryMode: mode,
        territories,
        preorder,
        preorderOn: String(data.get("preorderOn") ?? ""),
        prelisten,
        prelistenOn: String(data.get("prelistenOn") ?? ""),
        priceTier: String(data.get("priceTier") ?? "") as
          "" | (typeof PRICE_TIERS)[number],
        notes: String(data.get("notes") ?? ""),
        coverSheetId: String(data.get("coverSheetId") ?? ""),
      }),
    );
  }

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={submit}>
      <ChoiceCards
        name="territoryMode"
        legend={t.form.territoryMode}
        value={mode}
        onChange={setMode}
        choices={TERRITORY_MODES.map((value) => ({
          value,
          label: t.territoryModes[value],
          hint: t.territoryHints[value],
        }))}
      />
      {mode !== "world" && (
        <OptionSelect
          multiple
          name="territories"
          label={t.form.countries}
          placeholder={t.form.countriesPlaceholder}
          items={countryItems()}
          defaultValue={params.territories}
          error={countriesError}
          required
        />
      )}
      <ChoiceCards
        name="preorder"
        legend={t.form.preorder}
        columns={3}
        value={preorder}
        onChange={setPreorder}
        choices={yesNoChoices}
      />
      {preorder === "yes" && (
        <Field
          name="preorderOn"
          label={t.form.preorderOn}
          type="date"
          defaultValue={params.preorderOn ?? ""}
        />
      )}
      <ChoiceCards
        name="prelisten"
        legend={t.form.prelisten}
        columns={3}
        value={prelisten}
        onChange={setPrelisten}
        choices={yesNoChoices}
      />
      {prelisten === "yes" && (
        <Field
          name="prelistenOn"
          label={t.form.prelistenOn}
          type="date"
          defaultValue={params.prelistenOn ?? ""}
        />
      )}
      <OptionSelect
        name="priceTier"
        label={t.form.priceTier}
        placeholder={t.form.priceTierPlaceholder}
        items={Object.fromEntries(
          PRICE_TIERS.map((tier) => [tier, t.priceTiers[tier]]),
        )}
        defaultValue={params.priceTier}
      />
      {sheets.length > 0 ? (
        <OptionSelect
          name="coverSheetId"
          label={t.form.cover}
          placeholder={t.form.coverPlaceholder}
          hint={t.form.coverHint}
          items={Object.fromEntries(
            sheets.map((sheet) => [sheet.id, sheet.label]),
          )}
          defaultValue={params.coverSheetId}
        />
      ) : (
        <p className="text-sm text-muted-foreground">{t.form.coverNone}</p>
      )}
      <TextareaField
        name="notes"
        label={t.form.notes}
        hint={t.form.notesHint}
        rows={3}
        maxLength={2000}
        defaultValue={params.notes ?? ""}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.form.submit}
        onCancel={onDone}
      />
    </form>
  );
}
