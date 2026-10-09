"use client";

import { IconTrash } from "nucleo-sharp-essential";
import { useState } from "react";

import { MoveButtons } from "@/components/ui/move-buttons";
import { useDraftSave } from "@/components/strategy/generator/use-draft-save";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import type { Phase } from "@/lib/strategy/documents/model";
import { inPhase, phaseRange } from "@/lib/strategy/documents/phases";
import { move } from "@/lib/utils/move";

const bound = (raw: string): number | null => {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? Math.max(-365, Math.min(365, n)) : null;
};

/**
 * Step 2 (ticket § 11): the campaign phases PO proposed from the calendar.
 * Validate, rename, reorder or add; their number and names are the owner's.
 */
export function PhasesStep({
  projectId,
  initial,
  offsets,
  nextHref,
}: {
  projectId: string;
  initial: Phase[];
  // Days from the release of every milestone: what each phase will cover.
  offsets: number[];
  nextHref: string;
}) {
  const t = fr.strategyDocs.plan;
  const g = fr.strategyDocs.generator;
  const { pending, save } = useDraftSave(projectId, "release_plan");
  const [phases, setPhases] = useState(initial);
  const update = (id: string, patch: Partial<Phase>) =>
    setPhases((list) =>
      list.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-display-sm font-semibold">{t.phasesTitle}</h2>
        <p className="max-w-prose text-body-md text-muted-foreground">
          {t.phasesBody}
        </p>
      </div>
      {phases.length === 0 && (
        <ToneCallout tone="neutral">{t.noPhases}</ToneCallout>
      )}
      <ol className="flex flex-col gap-3">
        {phases.map((phase, index) => {
          const count = offsets.filter((d) => inPhase(phase, d)).length;
          return (
            <li
              key={phase.id}
              className="flex flex-col gap-3 rounded-2xl border border-border p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-caption text-muted-foreground tabular-nums">
                  {phaseRange(phase)} · {t.phaseItems(count)}
                </span>
                <span className="flex items-center gap-1">
                  <MoveButtons
                    upLabel={g.moveUpLabel(phase.name)}
                    downLabel={g.moveDownLabel(phase.name)}
                    first={index === 0}
                    last={index === phases.length - 1}
                    onMove={(delta) => setPhases((l) => move(l, index, delta))}
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={g.removeLabel(phase.name)}
                    onClick={() =>
                      setPhases((l) => l.filter((p) => p.id !== phase.id))
                    }
                  >
                    <IconTrash aria-hidden className="size-4" />
                  </Button>
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_7rem]">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`phase-${phase.id}-name`}>
                    {t.phaseName}
                  </Label>
                  <Input
                    id={`phase-${phase.id}-name`}
                    value={phase.name}
                    maxLength={80}
                    onChange={(e) => update(phase.id, { name: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`phase-${phase.id}-from`}>
                    {t.phaseFrom}
                  </Label>
                  <Input
                    id={`phase-${phase.id}-from`}
                    type="number"
                    inputMode="numeric"
                    value={phase.from ?? ""}
                    onChange={(e) =>
                      update(phase.id, { from: bound(e.target.value) })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`phase-${phase.id}-to`}>{t.phaseTo}</Label>
                  <Input
                    id={`phase-${phase.id}-to`}
                    type="number"
                    inputMode="numeric"
                    value={phase.to ?? ""}
                    onChange={(e) =>
                      update(phase.id, { to: bound(e.target.value) })
                    }
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={phases.length >= 12}
          onClick={() =>
            setPhases((l) => [
              ...l,
              {
                id: `phase-${Date.now().toString(36)}`,
                name: t.newPhase,
                from: null,
                to: null,
              },
            ])
          }
        >
          {g.add}
        </Button>
        <Button
          type="button"
          disabled={pending || phases.some((p) => p.name.trim() === "")}
          onClick={() => save({ phases, phasesConfirmed: true }, nextHref)}
        >
          {pending ? g.saving : g.validate}
        </Button>
      </div>
    </section>
  );
}
