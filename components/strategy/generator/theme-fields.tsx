"use client";

import { ChoiceCards } from "@/components/ui/choice-cards";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fr } from "@/lib/i18n/fr";
import { THEMES, type Theme } from "@/lib/strategy/documents/model";

/** The document's direction chosen by hand: one of three themes, an accent. */
export function ThemeFields({
  idPrefix,
  theme,
  accent,
  onChange,
}: {
  idPrefix: string;
  theme: Theme;
  accent: string;
  onChange: (value: { theme: Theme; accent: string }) => void;
}) {
  const t = fr.strategyDocs.plan;
  return (
    <div className="flex flex-col gap-4">
      <ChoiceCards
        name={`${idPrefix}-theme`}
        legend={t.directionTitle}
        hideLegend
        columns={3}
        value={theme}
        onChange={(value) => onChange({ theme: value, accent })}
        choices={THEMES.map((value) => ({
          value,
          label: t.themes[value].name,
          hint: t.themes[value].body,
        }))}
      />
      <div className="flex items-center gap-3">
        <Label htmlFor={`${idPrefix}-accent`}>{t.accent}</Label>
        <Input
          id={`${idPrefix}-accent`}
          type="color"
          value={accent}
          onChange={(e) => onChange({ theme, accent: e.target.value })}
          className="h-9 w-16 p-1"
        />
      </div>
    </div>
  );
}
