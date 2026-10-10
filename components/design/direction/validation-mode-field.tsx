"use client";

import { useState } from "react";

import { useDesignAction } from "@/components/design/work/use-design-action";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { setDesignValidationMode } from "@/lib/design/actions/people";
import { fr } from "@/lib/i18n/fr";

type Mode = "global" | "per_section";
const MODES: Mode[] = ["per_section", "global"];

/**
 * How the direction is validated: one decision for the whole version, or
 * one per section. Chosen by the owner; saved as soon as it changes.
 */
export function ValidationModeField({
  projectId,
  mode,
  canEdit,
}: {
  projectId: string;
  mode: Mode;
  canEdit: boolean;
}) {
  const t = fr.conception;
  const [value, setValue] = useState<Mode>(mode);
  const { pending, run } = useDesignAction();

  if (!canEdit)
    return (
      <p className="text-body-md text-muted-foreground">
        {fr.conceptionDirection.people.modeReadOnly(t.validationModes[mode])}
      </p>
    );

  return (
    <ChoiceCards
      name="validation-mode"
      legend={fr.conceptionDirection.people.modeLegend}
      columns={1}
      disabled={pending}
      value={value}
      // Shown once saved: a refusal leaves the previous choice in place.
      onChange={(next) =>
        run(() => setDesignValidationMode(projectId, next), {
          success: fr.conceptionDirection.people.modeSaved,
          onSuccess: () => setValue(next),
        })
      }
      choices={MODES.map((m) => ({
        value: m,
        label: t.validationModes[m],
        hint: t.validationModeHints[m],
      }))}
    />
  );
}
