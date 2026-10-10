"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useState } from "react";

import { OptionSelect } from "@/components/framing/option-select";
import { labelClass } from "@/components/strategy/option-class";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fr } from "@/lib/i18n/fr";
import { availablePresets } from "@/lib/strategy/lever-presets";

type Family = keyof typeof fr.framing.needs.families;

/**
 * Adding levers: the common ones in one click (offered by code, those the
 * project does not have yet), the Brief needs still without a lever, or any
 * other lever typed with its family. Each lands « à arbitrer ».
 */
export function LeverForm({
  levers,
  openNeeds,
  pending,
  onAdd,
  onFromNeed,
}: {
  levers: Array<{ label: string }>;
  openNeeds: Array<{ id: string; label: string }>;
  pending: boolean;
  // Resolves once the lever is saved, then the field empties.
  onAdd: (label: string, family: Family, done?: () => void) => void;
  onFromNeed: (needId: string) => void;
}) {
  const t = fr.strategy.levers;
  const d = fr.strategyDispositif;
  const families = fr.framing.needs.families;
  const [label, setLabel] = useState("");
  const [family, setFamily] = useState<Family>("promotion_distribution");
  const presets = availablePresets(levers);

  return (
    <div className="flex flex-col gap-6">
      {openNeeds.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className={labelClass}>{t.needsTitle}</p>
          <div className="flex flex-wrap gap-2">
            {openNeeds.map((need) => (
              <Button
                key={need.id}
                variant="outline"
                disabled={pending}
                title={t.fromNeedAction}
                onClick={() => onFromNeed(need.id)}
              >
                <IconPlus aria-hidden />
                {need.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {presets.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className={labelClass}>{d.presetsTitle}</p>
            <p className="text-caption text-muted-foreground">
              {d.presetsHint}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.key}
                variant="outline"
                disabled={pending}
                aria-label={d.addPreset(preset.label)}
                onClick={() => onAdd(preset.label, preset.family)}
              >
                <IconPlus aria-hidden />
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          onAdd(label, family, () => setLabel(""));
        }}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Label htmlFor="lever-label" required className={labelClass}>
            {d.otherTitle}
          </Label>
          <Input
            id="lever-label"
            aria-required
            maxLength={200}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="lever-family" required className={labelClass}>
            {t.family}
          </Label>
          <OptionSelect
            id="lever-family"
            required
            label={t.family}
            options={families}
            value={family}
            onChange={(v) => setFamily(v as Family)}
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          disabled={pending || label.trim() === ""}
        >
          {fr.framing.actions.add}
        </Button>
      </form>
    </div>
  );
}
