"use client";

import { IconTrash } from "nucleo-sharp-essential";
import { useState } from "react";

import { useDraftSave } from "@/components/strategy/release-plan/use-draft-save";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoveButtons } from "@/components/ui/move-buttons";
import { ToneCallout } from "@/components/ui/tone-callout";
import { strategyReleasePlan } from "@/lib/i18n/fr/strategy-release-plan";
import { inPhase, phaseRange } from "@/lib/strategy/documents/phases";
import type { Phase } from "@/lib/strategy/documents/release-plan-model";
import { move } from "@/lib/utils/move";

const fr = { strategyReleasePlan };

const bound = (raw: string): number | null => {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? Math.max(-365, Math.min(365, n)) : null;
};

/**
 * Step 2 (ticket § 11): the campaign phases PO proposed from the calendar.
 * Validate, rename, reorder, add or remove: their number and names are the
 * owner's, each phase's bounds say which milestones it groups.
 */
export function PhasesStep({
  projectId,
  initial,
  offsets,
  nextHref,
  canEdit,
}: {
  projectId: string;
  initial: Phase[];
  // Days from the release of every milestone: what each phase will cover.
  offsets: number[];
  nextHref: string;
  canEdit: boolean;
}) {
  const t = fr.strategyReleasePlan.phases;
  const a = fr.strategyReleasePlan.actions;
  const { pending, save } = useDraftSave(projectId);
  const [phases, setPhases] = useState(initial);
  const update = (id: string, patch: Partial<Phase>) =>
    setPhases((list) =>
      list.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );

  return (
    <section aria-labelledby="phases-title" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 id="phases-title" className="text-display-sm font-semibold">
          {t.title}
        </h2>
        <p className="max-w-prose text-body-md text-muted-foreground">
          {t.body}
        </p>
      </div>
      {phases.length === 0 && (
        <ToneCallout tone="neutral">{t.none}</ToneCallout>
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
                  {phaseRange(phase)} · {t.items(count)}
                </span>
                {canEdit && (
                  <span className="flex items-center gap-1">
                    <MoveButtons
                      upLabel={a.moveUpLabel(phase.name)}
                      downLabel={a.moveDownLabel(phase.name)}
                      first={index === 0}
                      last={index === phases.length - 1}
                      onMove={(delta) =>
                        setPhases((l) => move(l, index, delta))
                      }
                    />
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={a.removeLabel(phase.name)}
                      onClick={() =>
                        setPhases((l) => l.filter((p) => p.id !== phase.id))
                      }
                    >
                      <IconTrash aria-hidden className="size-4" />
                    </Button>
                  </span>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_7rem]">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`phase-${phase.id}-name`}>{t.name}</Label>
                  <Input
                    id={`phase-${phase.id}-name`}
                    value={phase.name}
                    maxLength={80}
                    disabled={!canEdit}
                    onChange={(e) => update(phase.id, { name: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`phase-${phase.id}-from`}>{t.from}</Label>
                  <Input
                    id={`phase-${phase.id}-from`}
                    type="number"
                    inputMode="numeric"
                    disabled={!canEdit}
                    value={phase.from ?? ""}
                    onChange={(e) =>
                      update(phase.id, { from: bound(e.target.value) })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`phase-${phase.id}-to`}>{t.to}</Label>
                  <Input
                    id={`phase-${phase.id}-to`}
                    type="number"
                    inputMode="numeric"
                    disabled={!canEdit}
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
      {canEdit && (
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
            {a.add}
          </Button>
          <Button
            type="button"
            disabled={pending || phases.some((p) => p.name.trim() === "")}
            onClick={() => save({ phases, phasesConfirmed: true }, nextHref)}
          >
            {pending ? a.saving : a.validate}
          </Button>
        </div>
      )}
    </section>
  );
}
