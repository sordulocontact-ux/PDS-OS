"use client";

import { useState } from "react";

import { useDraftSave } from "@/components/strategy/release-plan/use-draft-save";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { StepSection } from "@/components/shell/journey/step-section";
import { strategyPressKit } from "@/lib/i18n/fr/strategy-press-kit";
import { strategyReleasePlan } from "@/lib/i18n/fr/strategy-release-plan";
import type { PressBlock } from "@/lib/strategy/documents/press-kit-model";
import { draftTone } from "@/lib/ui/state-tones";

const fr = { strategyReleasePlan, strategyPressKit };

type Item = {
  key: PressBlock;
  text: string;
  excluded: boolean;
  // What PO proposed from known data ("" when nothing is known).
  proposed: string;
};

/**
 * Step 2 of the Dossier de presse (ticket § 12): the dossier's texts, each
 * prefilled from the artist sheet, the validated Brief and the project —
 * never asked again —; an unknown one is said missing. The owner rewrites,
 * leaves out or takes back the proposed text.
 */
export function PressContentStep({
  projectId,
  initial,
  bioSource,
  nextHref,
  canEdit,
}: {
  projectId: string;
  initial: Item[];
  // Where the artist's text comes from, if known.
  bioSource: "manual" | "deezer" | "wikipedia" | null;
  nextHref: string;
  canEdit: boolean;
}) {
  const t = fr.strategyPressKit.content;
  const a = fr.strategyReleasePlan.actions;
  const { pending, save } = useDraftSave(projectId, "press_kit");
  const [items, setItems] = useState(initial);
  const update = (key: PressBlock, patch: Partial<Item>) =>
    setItems((list) =>
      list.map((x) => (x.key === key ? { ...x, ...patch } : x)),
    );

  return (
    <StepSection title={t.title} description={t.body}>
      <div className="flex flex-col gap-6">
        <ul className="flex flex-col gap-5">
          {items.map((item) => {
            const id = `press-${item.key}`;
            const hint =
              item.key === "artist" && bioSource
                ? t.sources[bioSource]
                : t.hints[item.key];
            return (
              <li key={item.key} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Label htmlFor={id} className="text-body-md font-semibold">
                    {t.blocks[item.key]}
                  </Label>
                  {item.excluded ? (
                    <StatusBadge tone={draftTone} size="sm">
                      {t.excluded}
                    </StatusBadge>
                  ) : (
                    !item.text.trim() && (
                      <StatusBadge tone="warning" size="sm">
                        {t.missing}
                      </StatusBadge>
                    )
                  )}
                </div>
                <p className="text-caption text-muted-foreground">{hint}</p>
                <Textarea
                  id={id}
                  value={item.text}
                  rows={item.key === "artist" ? 6 : 4}
                  maxLength={6000}
                  disabled={!canEdit || item.excluded}
                  onChange={(e) => update(item.key, { text: e.target.value })}
                />
                {canEdit && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        update(item.key, { excluded: !item.excluded })
                      }
                    >
                      {item.excluded ? t.include : t.hide}
                    </Button>
                    {item.proposed && item.text !== item.proposed && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          update(item.key, { text: item.proposed })
                        }
                      >
                        {t.reset}
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {canEdit && (
          <Button
            type="button"
            className="self-start"
            disabled={pending}
            onClick={() =>
              save(
                {
                  texts: items.map(({ key, text, excluded }) => ({
                    key,
                    text,
                    excluded,
                  })),
                  textsConfirmed: true,
                },
                nextHref,
              )
            }
          >
            {pending ? a.saving : a.validate}
          </Button>
        )}
      </div>
    </StepSection>
  );
}
