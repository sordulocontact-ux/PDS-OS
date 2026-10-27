"use client";

import { useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { ChipChoice } from "@/components/ui/chip-choice";
import { productionBrief } from "@/lib/i18n/fr/production-brief";
import {
  CAMERA_SETUPS,
  COVERAGES,
  MAX_BRIEF_TEXT,
  SOUND_CAPTURES,
  type BriefTextField,
  type ProductionBrief,
  type ProductionBriefChoices,
} from "@/lib/production/brief";
import { saveProductionBrief } from "@/lib/production/brief-actions";

const fr = { productionBrief };

type ChoiceKey = keyof ProductionBriefChoices;

// The label and meaning of one value of a closed choice.
const choiceText = (key: ChoiceKey, value: string) =>
  (
    fr.productionBrief.choices[key] as Record<
      string,
      { label: string; description: string }
    >
  )[value];

const TRAILING_TEXTS = [
  "runOfShow",
  "constraintsNote",
  "referencesNote",
  "openNeeds",
] as const satisfies readonly BriefTextField[];

/** The whole director's brief: three closed choices (a second click clears
 * one), each with its detail, and the free texts. Saved in one go. */
export function BriefForm({
  projectId,
  sheetId,
  brief,
  onDone,
  onCancel,
}: {
  projectId: string;
  sheetId: string;
  brief: ProductionBrief;
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = fr.productionBrief;
  const [choices, setChoices] = useState<ProductionBriefChoices>({
    coverage: brief.coverage,
    cameraSetup: brief.cameraSetup,
    soundCapture: brief.soundCapture,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const textArea = (field: BriefTextField) => (
    <TextareaField
      key={field}
      id={`production-brief-${field}`}
      name={field}
      label={t.fields[field].label}
      hint={t.fields[field].hint}
      defaultValue={brief[field] ?? ""}
      maxLength={MAX_BRIEF_TEXT}
      rows={3}
    />
  );

  const choiceField = <K extends ChoiceKey>(
    key: K,
    values: readonly NonNullable<ProductionBriefChoices[K]>[],
  ) => {
    type V = NonNullable<ProductionBriefChoices[K]>;
    // Same type, which TypeScript cannot narrow on a generic key.
    const value = choices[key] as V | null;
    return (
      <ChipChoice<V>
        name={key}
        legend={t.choiceLegends[key]}
        deselectable
        value={value}
        onChange={(next) =>
          setChoices((current) => ({ ...current, [key]: next }))
        }
        options={values.map((option) => ({
          value: option,
          label: choiceText(key, option).label,
        }))}
        // What the choice made means, and how to take it back.
        hint={
          value
            ? `${choiceText(key, value).description} ${t.deselect}`
            : undefined
        }
      />
    );
  };

  const submit = (form: HTMLFormElement) => {
    const values = new FormData(form);
    const read = (field: BriefTextField) => String(values.get(field) ?? "");
    setError(null);
    startTransition(async () => {
      const result = await saveProductionBrief({
        projectId,
        sheetId,
        ...choices,
        stagingIntent: read("stagingIntent"),
        coverageNote: read("coverageNote"),
        cameraNote: read("cameraNote"),
        soundNote: read("soundNote"),
        runOfShow: read("runOfShow"),
        constraintsNote: read("constraintsNote"),
        referencesNote: read("referencesNote"),
        openNeeds: read("openNeeds"),
      });
      if (result.ok) onDone();
      else setError(result.error);
    });
  };

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        submit(event.currentTarget);
      }}
    >
      {textArea("stagingIntent")}
      <div className="flex flex-col gap-3">
        {choiceField("coverage", COVERAGES)}
        {textArea("coverageNote")}
      </div>
      <div className="flex flex-col gap-3">
        {choiceField("cameraSetup", CAMERA_SETUPS)}
        {textArea("cameraNote")}
      </div>
      <div className="flex flex-col gap-3">
        {choiceField("soundCapture", SOUND_CAPTURES)}
        {textArea("soundNote")}
      </div>
      {TRAILING_TEXTS.map(textArea)}
      <FormMessage kind="error">{error}</FormMessage>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? t.saving : t.save}
        </Button>
      </div>
    </form>
  );
}
