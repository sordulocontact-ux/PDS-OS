"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { OptionSelect } from "@/components/projects/option-select";
import {
  DEFAULT_VARIANT,
  UNKNOWN_AUDIO_STATE,
} from "@/lib/catalog/title-rules";
import type { MasterFormDefaults } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";

/**
 * The optional facts of a title, all fillable at creation when they are
 * known (docs/ARCHITECTURE.md § 2 septies): audio state, variant (with its
 * own words for "Autre"), ISRC, duration. Audio state and variant are two
 * separate selects: never one "version" field again.
 */
export function TitleDetailsFields({
  prefix,
  values,
  errors,
  onAudioStateChange,
}: {
  // Field ids are prefixed in a modal: the form behind has fields too.
  prefix: string;
  values: Partial<MasterFormDefaults>;
  errors: Record<string, string | undefined>;
  onAudioStateChange?: (state: string) => void;
}) {
  const t = fr.catalog.masterForm.fields;
  const [variant, setVariant] = useState(values.variant || DEFAULT_VARIANT);

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <OptionSelect
          id={`${prefix}audioState`}
          name="audioState"
          label={t.audioState}
          hint={t.audioStateHint}
          items={{
            [UNKNOWN_AUDIO_STATE]: t.audioStateUnknown,
            ...fr.catalog.audioStates,
          }}
          defaultValue={values.audioState || UNKNOWN_AUDIO_STATE}
          error={errors.audioState}
          onValueChange={onAudioStateChange}
        />
        <OptionSelect
          id={`${prefix}variant`}
          name="variant"
          label={t.variant}
          items={fr.catalog.variants}
          defaultValue={values.variant || DEFAULT_VARIANT}
          error={errors.variant}
          onValueChange={setVariant}
        />
      </div>

      {variant === "other" && (
        <Field
          id={`${prefix}variantLabel`}
          name="variantLabel"
          label={t.variantLabel}
          hint={t.variantLabelHint}
          autoComplete="off"
          maxLength={100}
          defaultValue={values.variantLabel ?? ""}
          error={errors.variantLabel}
        />
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id={`${prefix}isrc`}
          name="isrc"
          label={t.isrc}
          hint={t.isrcHint}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={20}
          defaultValue={values.isrc ?? ""}
          error={errors.isrc}
          className="h-10 font-mono text-base md:text-sm"
        />
        <Field
          id={`${prefix}duration`}
          name="duration"
          label={t.duration}
          hint={t.durationHint}
          autoComplete="off"
          placeholder={t.durationPlaceholder}
          maxLength={8}
          defaultValue={values.duration ?? ""}
          error={errors.duration}
          className="h-10 text-base tabular-nums md:text-sm"
        />
      </div>
    </>
  );
}
