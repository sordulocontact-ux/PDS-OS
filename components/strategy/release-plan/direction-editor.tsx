"use client";

import { useState } from "react";

import { OptionSelect } from "@/components/framing/option-select";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fr } from "@/lib/i18n/fr";
import {
  THEMES,
  type Direction,
  type FontPairing,
} from "@/lib/strategy/documents/direction";

const COLORS = ["background", "ink", "accent"] as const;

/**
 * « Modifier » a proposed direction: its theme, its three colours and its
 * typographic pairing. Saving makes it the owner's validated direction.
 */
export function DirectionEditor({
  initial,
  pending,
  onSave,
  onCancel,
}: {
  initial: Direction;
  pending: boolean;
  onSave: (direction: Direction) => void;
  onCancel: () => void;
}) {
  const t = fr.strategyReleasePlan.direction;
  const a = fr.strategyReleasePlan.actions;
  const [draft, setDraft] = useState(initial);
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...draft, accepted: true });
      }}
    >
      <ChoiceCards
        name="direction-theme"
        legend={t.title}
        columns={3}
        value={draft.theme}
        onChange={(theme) => setDraft((d) => ({ ...d, theme }))}
        choices={THEMES.map((value) => ({ value, label: t.themes[value] }))}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        {COLORS.map((key) => (
          <div key={key} className="flex flex-col gap-1.5">
            <Label htmlFor={`direction-${key}`}>{t[key]}</Label>
            <Input
              id={`direction-${key}`}
              type="color"
              value={draft[key]}
              aria-label={t.colorLabel(t[key])}
              onChange={(e) =>
                setDraft((d) => ({ ...d, [key]: e.target.value.toLowerCase() }))
              }
              className="h-10 p-1"
            />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="direction-fonts">{t.fonts}</Label>
        <OptionSelect
          id="direction-fonts"
          label={t.fonts}
          options={t.pairings}
          value={draft.fonts}
          onChange={(fonts) =>
            setDraft((d) => ({ ...d, fonts: fonts as FontPairing }))
          }
        />
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {a.cancel}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? a.saving : a.save}
        </Button>
      </div>
    </form>
  );
}
