"use client";

import { useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { fr } from "@/lib/i18n/fr";
import { openProductionSheet } from "@/lib/production/sheet-actions";
import type { ProductionMode } from "@/lib/production/sheet";

const MODES = ["direct", "call", "import"] as const;

/**
 * The three ways to organise a deliverable's production (ticket, parcours 1).
 * Choosing only organises the work in PDS OS: nothing is sent, booked or
 * ordered. The first choice starts the « production » stage.
 */
export function ModePicker({
  projectId,
  deliverableId,
  current,
  onDone,
}: {
  projectId: string;
  deliverableId: string;
  // The sheet's mode when changing it; null on the first opening.
  current: ProductionMode | null;
  onDone?: () => void;
}) {
  const t = fr.productionPrep.modes;
  const [mode, setMode] = useState<ProductionMode | null>(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!mode) return;
    setError(null);
    startTransition(async () => {
      const result = await openProductionSheet({
        projectId,
        deliverableId,
        mode,
      });
      if (result.ok) onDone?.();
      else setError(result.error);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <ChoiceCards
        name="mode"
        legend={t.title}
        hideLegend
        value={mode}
        onChange={setMode}
        choices={MODES.map((value) => ({
          value,
          label: t.options[value].label,
          hint: t.options[value].description,
        }))}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={submit}
          disabled={!mode || pending || mode === current}
        >
          {pending ? fr.productionPrep.saving : current ? t.save : t.submit}
        </Button>
        {!current && (
          <p className="text-sm text-muted-foreground">{t.startsStage}</p>
        )}
      </div>
    </div>
  );
}
