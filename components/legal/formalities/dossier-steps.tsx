"use client";

import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { fr } from "@/lib/i18n/fr";

/** The SACEM dossier's steps (JUR-21): its sections then the recap, as
 * chips to jump to one, or « Précédent » / « Suivant » under the step. */
export function DossierStepChips({
  sections,
  step,
  onStep,
}: {
  sections: readonly string[];
  step: number | "all";
  onStep: (step: number) => void;
}) {
  const t = fr.legalFormalities;
  return (
    <nav aria-label={t.recap.stepsLabel} className="flex flex-wrap gap-1.5">
      {[...sections, "recap"].map((key, i) => (
        <FilterChip key={key} pressed={step === i} onClick={() => onStep(i)}>
          {t.recap.step(
            i + 1,
            key === "recap" ? t.recap.title : t.sections[key],
          )}
        </FilterChip>
      ))}
    </nav>
  );
}

export function DossierStepButtons({
  step,
  last,
  onStep,
}: {
  step: number;
  // The recap's index: the step after the last section.
  last: number;
  onStep: (step: number) => void;
}) {
  const t = fr.legalFormalities.recap;
  return (
    <div className="flex justify-between gap-2">
      <Button
        variant="ghost"
        disabled={step === 0}
        onClick={() => onStep(step - 1)}
      >
        {t.previous}
      </Button>
      {step < last && (
        <Button variant="outline" onClick={() => onStep(step + 1)}>
          {step === last - 1 ? t.toRecap : t.next}
        </Button>
      )}
    </div>
  );
}
