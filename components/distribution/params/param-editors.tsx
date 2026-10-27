"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { countryItems } from "@/lib/catalog/countries";
import {
  PRICE_TIERS,
  TERRITORY_MODES,
  type TerritoryMode,
} from "@/lib/distribution/dossier";
import type { ParamsData } from "@/lib/distribution/params-view";
import { distribution } from "@/lib/i18n/fr/distribution";
import { distributionJourney } from "@/lib/i18n/fr/distribution-journey";

const fr = { distribution, distributionJourney };

const t = fr.distributionJourney.params;
const d = fr.distribution.dossier;

// The fields of each editor, read from its <form> on « Enregistrer »
// (lib/distribution/params-actions.ts, updateDistributionParams).

export function TerritoriesEditor({
  data,
  error,
}: {
  data: ParamsData;
  error?: string;
}) {
  const [mode, setMode] = useState<TerritoryMode>(data.params.territoryMode);
  return (
    <div className="flex flex-col gap-3">
      <ChoiceCards
        name="territoryMode"
        legend={t.labels.territories}
        hideLegend
        variant="list"
        value={mode}
        onChange={setMode}
        choices={TERRITORY_MODES.map((value) => ({
          value,
          label: d.territoryModes[value],
          hint: d.territoryHints[value],
        }))}
      />
      {mode !== "world" && (
        <OptionSelect
          multiple
          name="territories"
          label={t.country}
          placeholder={d.form.countriesPlaceholder}
          items={countryItems()}
          defaultValue={data.params.territories}
          error={error}
          required
        />
      )}
    </div>
  );
}

export function YesNoEditor({
  data,
  field,
  error,
}: {
  data: ParamsData;
  field: "preorder" | "prelisten";
  error?: string;
}) {
  const current = data.params[field];
  const proposal = field === "preorder" ? data.preorderProposal : null;
  const [value, setValue] = useState<"yes" | "no" | null>(
    current === null ? (proposal ? "yes" : null) : current ? "yes" : "no",
  );
  const on = field === "preorder" ? "preorderOn" : "prelistenOn";
  return (
    <div className="flex flex-col gap-3">
      <ChoiceCards
        name={field}
        legend={t.labels[field]}
        hideLegend
        columns={2}
        value={value}
        onChange={setValue}
        choices={[
          { value: "yes", label: t.yes },
          { value: "no", label: t.no },
        ]}
      />
      {value === "yes" && (
        <Field
          name={on}
          type="date"
          label={field === "preorder" ? t.preorderOn : t.prelistenOn}
          defaultValue={data.params[on] ?? proposal?.date ?? ""}
          max={data.releaseDate ?? undefined}
          hint={data.releaseDay ? t.beforeRelease(data.releaseDay) : undefined}
          error={error}
          required
        />
      )}
      {value === null && error && (
        <p
          role="alert"
          className="text-[length:var(--type-caption)] text-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export function TierEditor({
  data,
  error,
}: {
  data: ParamsData;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <ChoiceCards
        name="priceTier"
        legend={t.labels.priceTier}
        hideLegend
        variant="list"
        defaultValue={data.params.priceTier ?? undefined}
        choices={PRICE_TIERS.map((value) => ({
          value,
          label: d.priceTiers[value],
        }))}
      />
      {error && (
        <p
          role="alert"
          className="text-[length:var(--type-caption)] text-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export function NotesEditor({ data }: { data: ParamsData }) {
  return (
    <TextareaField
      name="notes"
      label={t.labels.notes}
      rows={3}
      maxLength={2000}
      placeholder={t.notesPlaceholder}
      defaultValue={data.params.notes ?? ""}
    />
  );
}

/** What the form of a row says, as a patch of the parameters, or a refusal
 * said under its field (checked again on the server). */
export function patchOf(
  key: "territories" | "preorder" | "prelisten" | "priceTier" | "notes",
  form: FormData,
  data: ParamsData,
): { patch: Record<string, unknown> } | { error: string } {
  const text = (name: string) => String(form.get(name) ?? "").trim();
  switch (key) {
    case "territories": {
      const mode = text("territoryMode");
      // OptionSelect `multiple` submits a JSON array under its name.
      let countries: string[] = [];
      try {
        const raw: unknown = JSON.parse(
          String(form.get("territories") ?? "[]"),
        );
        if (Array.isArray(raw)) countries = raw.map(String).filter(Boolean);
      } catch {
        countries = [];
      }
      if (mode !== "world" && countries.length === 0)
        return { error: t.errors.countries };
      return { patch: { territoryMode: mode, territories: countries } };
    }
    case "preorder":
    case "prelisten": {
      const value = text(key);
      if (value !== "yes" && value !== "no") return { error: t.errors.yesNo };
      const on = key === "preorder" ? "preorderOn" : "prelistenOn";
      if (value === "no") return { patch: { [key]: "no", [on]: null } };
      const date = text(on);
      if (!date) return { error: t.errors.date };
      if (data.releaseDate && date >= data.releaseDate)
        return {
          error:
            key === "preorder"
              ? t.errors.preorderLate(data.releaseDay ?? "")
              : t.errors.prelistenLate(data.releaseDay ?? ""),
        };
      return { patch: { [key]: "yes", [on]: date } };
    }
    case "priceTier": {
      const tier = text("priceTier");
      return tier ? { patch: { priceTier: tier } } : { error: t.errors.tier };
    }
    case "notes":
      return { patch: { notes: text("notes") } };
  }
}
