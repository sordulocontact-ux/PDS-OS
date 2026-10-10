"use client";

import { useState } from "react";

import { SourcedField } from "@/components/design/sheets/sourced-field";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { FilterChip } from "@/components/ui/filter-chip";
import { FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  isRatio,
  RATIO_PRESETS,
  SUBTITLE_MODES,
  type SheetProvenance,
} from "@/lib/design/sheet-fields";
import type { SetSheetValue, SheetFormValues } from "@/lib/design/sheet-form";
import { fr } from "@/lib/i18n/fr";

const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

/**
 * Formats of the sheet: target duration (a value or a range), ratios (the
 * usual ones in one click, any other typed), subtitles — yes or no, which
 * ratios carry them, burned in and/or a separate file — and variants.
 */
export function SheetFormatFields({
  values,
  provenance,
  set,
}: {
  values: SheetFormValues;
  provenance: SheetProvenance;
  set: SetSheetValue;
}) {
  const f = fr.conceptionSheet.fields;
  const [other, setOther] = useState("");
  const ratios = [
    ...RATIO_PRESETS,
    ...values.ratios.filter(
      (r) => !(RATIO_PRESETS as readonly string[]).includes(r),
    ),
  ];
  const addOther = () => {
    const ratio = other.trim();
    if (!isRatio(ratio)) return;
    if (!values.ratios.includes(ratio))
      set("ratios", [...values.ratios, ratio]);
    setOther("");
  };

  return (
    <FormSection title={fr.conceptionSheet.sections.formats}>
      <div className="grid gap-4 sm:grid-cols-2">
        <SourcedField
          id="sheet-duration-min"
          label={f.durationMin}
          source={provenance.duration?.source}
          hint={f.durationHint}
        >
          <Input
            id="sheet-duration-min"
            inputMode="numeric"
            placeholder="3:00"
            value={values.durationMin}
            aria-describedby="sheet-duration-min-hint"
            onChange={(e) => set("durationMin", e.target.value)}
          />
        </SourcedField>
        <SourcedField id="sheet-duration-max" label={f.durationMax}>
          <Input
            id="sheet-duration-max"
            inputMode="numeric"
            value={values.durationMax}
            onChange={(e) => set("durationMax", e.target.value)}
          />
        </SourcedField>
      </div>

      <SourcedField
        id="sheet-ratio-other"
        label={f.ratios}
        source={provenance.ratios?.source}
      >
        <div className="flex flex-wrap gap-2">
          {ratios.map((ratio) => (
            <FilterChip
              key={ratio}
              pressed={values.ratios.includes(ratio)}
              onClick={() => set("ratios", toggle(values.ratios, ratio))}
            >
              {ratio}
            </FilterChip>
          ))}
        </div>
        <div className="flex max-w-xs gap-2">
          <Input
            id="sheet-ratio-other"
            aria-label={f.ratioOther}
            placeholder={f.ratioOtherPlaceholder}
            value={other}
            onChange={(e) => setOther(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              addOther();
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={!isRatio(other)}
            onClick={addOther}
          >
            {f.ratioAdd}
          </Button>
        </div>
      </SourcedField>

      <ChoiceCards
        name="subtitles"
        legend={f.subtitles}
        columns={3}
        value={values.subtitles}
        onChange={(value) => set("subtitles", value)}
        choices={(["", "yes", "no"] as const).map((value) => ({
          value,
          label: f.subtitleChoices[value],
        }))}
      />
      {values.subtitles === "yes" && (
        <>
          <SourcedField id="sheet-subtitle-ratios" label={f.subtitleRatios}>
            <div id="sheet-subtitle-ratios" className="flex flex-wrap gap-2">
              {values.ratios.map((ratio) => (
                <FilterChip
                  key={ratio}
                  variant="soft"
                  pressed={values.subtitleRatios.includes(ratio)}
                  onClick={() =>
                    set("subtitleRatios", toggle(values.subtitleRatios, ratio))
                  }
                >
                  {ratio}
                </FilterChip>
              ))}
            </div>
          </SourcedField>
          <ChoiceCards
            name="subtitleMode"
            legend={f.subtitleMode}
            columns={3}
            value={values.subtitleMode || null}
            onChange={(value) => set("subtitleMode", value)}
            choices={SUBTITLE_MODES.map((value) => ({
              value,
              label: f.subtitleModes[value],
            }))}
          />
        </>
      )}

      <SourcedField
        id="sheet-variants"
        label={f.variants}
        source={provenance.variants?.source}
      >
        <Textarea
          id="sheet-variants"
          rows={2}
          maxLength={2000}
          value={values.variants}
          onChange={(e) => set("variants", e.target.value)}
        />
      </SourcedField>
    </FormSection>
  );
}
