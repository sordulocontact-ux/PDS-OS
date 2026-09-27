"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AddNeedDialog } from "@/components/framing/guide/add-need-dialog";
import { FramingStepCard } from "@/components/framing/guide/step-card";
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
import { fr } from "@/lib/i18n/fr";

const GROUPS: NeedGroup[] = ["needs", "activations"];
const groupOf = (family: string): NeedGroup =>
  isActivation(family) ? "activations" : "needs";
const normalize = (s: string) => s.trim().toLowerCase();

/**
 * Needs and activations as chips. Clicking only changes the selection on
 * screen: everything is saved at once with "Confirmer cette sélection"
 * (added, removed, and what a call proposed confirmed).
 */
export function NeedsStep({
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
  const router = useRouter();
  const { pending, run } = useFramingAction();
  const [defining, setDefining] = useState(needs.length > 0 || !editable);
  const saved = GROUPS.flatMap((g) => needChips(needs, g));
  // Chips typed with "Ajouter un besoin", not saved yet.
  const [added, setAdded] = useState<NeedChip[]>([]);
  const [on, setOn] = useState<Set<string>>(
    () => new Set(saved.filter((c) => c.need).map((c) => c.key)),
  );
  const chips = [...saved, ...added];

  if (!defining)
    return (
      <FramingStepCard
        eyebrow={t.eyebrow}
        title={t.introTitle}
        description={t.introBody}
        actions={
          <Button size="lg" onClick={() => setDefining(true)}>
            {t.define}
          </Button>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          {(
            [
              [t.needsTitle, t.needsBody],
              [t.activationsTitle, t.activationsBody],
            ] as const
          ).map(([title, body]) => (
            <div
              key={title}
              className="flex flex-col gap-1 rounded-2xl bg-[var(--surface-tint)] p-4"
            >
              <p className="text-body-md font-semibold">{title}</p>
              <p className="text-body-md text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </FramingStepCard>
    );

  const toggle = (key: string) =>
    setOn((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // A name already offered just turns its chip on; a new one gets a chip.
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

  const confirm = () =>
    run(
      () =>
        saveNeedsSelection(
          projectId,
          chips
            .filter((c) => !c.need && on.has(c.key))
            .map((c) => ({ label: c.label, family: c.family })),
          chips.flatMap((c) => (c.need && !on.has(c.key) ? [c.need.id] : [])),
        ),
      () => router.push(nextHref),
    );

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
    <FramingStepCard
      eyebrow={t.eyebrow}
      title={t.title}
      actions={
        editable && (
          <>
            <Button size="lg" disabled={pending} onClick={confirm}>
              {t.confirm}
            </Button>
            <AddNeedDialog onAdd={add} disabled={pending} />
          </>
        )
      }
    >
      {group("needs", t.needsGroup)}
      {group("activations", t.activationsGroup)}
      <p className="text-body-md text-muted-foreground">{t.note}</p>
    </FramingStepCard>
  );
}
