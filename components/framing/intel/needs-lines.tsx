"use client";

import { useState } from "react";

import { useNextQuestion } from "@/components/framing/dimensions/use-next-question";
import { AddNeedDialog } from "@/components/framing/guide/add-need-dialog";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { saveNeedsSelection } from "@/lib/framing/actions/needs-team";
import {
  isActivation,
  needChips,
  type NeedChip,
  type NeedGroup,
} from "@/lib/framing/guide";
import type { FramingData } from "@/lib/framing/queries";
import { framingGuide } from "@/lib/i18n/fr/framing-guide";
import { framingJourney } from "@/lib/i18n/fr/framing-journey";

const fr = { framingGuide, framingJourney };

const GROUPS: NeedGroup[] = ["needs", "activations"];
const groupOf = (family: string): NeedGroup =>
  isActivation(family) ? "activations" : "needs";
const normalize = (s: string) => s.trim().toLowerCase();

/**
 * « Ce qu'il faut produire » (dimension Objectif): needs and activations as
 * chips. Clicking only changes the selection on screen; « Confirmer cette
 * sélection » saves it at once (added, removed, proposed ones confirmed).
 */
export function NeedsLines({
  needs,
  projectId,
  editable,
  nextHref,
}: {
  needs: FramingData["needs"];
  projectId: string;
  editable: boolean;
  nextHref: string;
}) {
  const t = fr.framingGuide.needs;
  const goNext = useNextQuestion(nextHref, "needs");
  const { pending, run } = useFramingAction();
  const saved = GROUPS.flatMap((g) => needChips(needs, g));
  const [added, setAdded] = useState<NeedChip[]>([]);
  const [on, setOn] = useState<Set<string>>(
    () => new Set(saved.filter((c) => c.need).map((c) => c.key)),
  );
  const chips = [...saved, ...added];

  const toggle = (key: string) =>
    setOn((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const add = (label: string, family: string) => {
    const same = chips.find(
      (c) =>
        groupOf(c.family) === groupOf(family) &&
        normalize(c.label) === normalize(label),
    );
    const key = same?.key ?? `new:${family}:${normalize(label)}`;
    if (!same)
      setAdded((list) => [...list, { key, label, family, need: null }]);
    setOn((current) => new Set(current).add(key));
  };
  const toAdd = chips.filter((c) => !c.need && on.has(c.key));
  const toRemove = chips.flatMap((c) =>
    c.need && !on.has(c.key) ? [c.need.id] : [],
  );
  const nothing = on.size === 0;

  const group = (key: NeedGroup, title: string) => (
    <div className="flex flex-col gap-2">
      <p className="text-caption text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-2">
        {chips
          .filter((chip) => groupOf(chip.family) === key)
          .map((chip) => (
            <FilterChip
              key={chip.key}
              pressed={on.has(chip.key)}
              variant="soft"
              disabled={!editable || pending}
              onClick={() => toggle(chip.key)}
            >
              {chip.label}
              {chip.need?.review_status === "proposed" && (
                <>
                  <span
                    aria-hidden
                    className="size-1.5 rounded-full bg-current"
                  />
                  <span className="sr-only">{t.proposedHint}</span>
                </>
              )}
            </FilterChip>
          ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {group("needs", t.needsGroup)}
      {group("activations", t.activationsGroup)}
      {editable && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="lg"
            disabled={pending || nothing}
            onClick={() =>
              run(
                () =>
                  saveNeedsSelection(
                    projectId,
                    toAdd.map((c) => ({ label: c.label, family: c.family })),
                    toRemove,
                  ),
                () => goNext(fr.framingJourney.dimensions.gesture.saved),
              )
            }
          >
            {t.confirm}
          </Button>
          <AddNeedDialog onAdd={add} disabled={pending} />
        </div>
      )}
    </div>
  );
}
