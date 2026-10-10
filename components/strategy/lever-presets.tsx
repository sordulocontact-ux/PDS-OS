"use client";

import { IconPlus } from "nucleo-sharp-essential";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { useCanEditProject } from "@/components/projects/edit-access";
import { labelClass } from "@/components/strategy/option-class";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import { addLever } from "@/lib/strategy/actions/levers";
import { LEVER_PRESETS, type LeverPreset } from "@/lib/strategy/dimensions";

/**
 * Common levers in one click (social organique, influence, RP, playlists,
 * partenariats): added « à arbitrer », like any lever. Those already in the
 * Dispositif are not offered again.
 */
export function LeverPresets({
  existing,
  projectId,
}: {
  existing: string[];
  projectId: string;
}) {
  const t = fr.strategyFlow.setup;
  const { pending, run } = useFramingAction();
  const canEdit = useCanEditProject();
  const taken = new Set(existing.map((label) => label.trim().toLowerCase()));
  const offered = (Object.keys(LEVER_PRESETS) as LeverPreset[]).filter(
    (key) => !taken.has(t.presets[key].toLowerCase()),
  );
  if (!canEdit || offered.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      <p className={labelClass}>{t.presetsTitle}</p>
      <div className="flex flex-wrap gap-2">
        {offered.map((key) => (
          <Button
            key={key}
            size="sm"
            variant="outline"
            disabled={pending}
            aria-label={t.add(t.presets[key])}
            onClick={() =>
              run(() => addLever(projectId, t.presets[key], LEVER_PRESETS[key]))
            }
          >
            <IconPlus aria-hidden className="size-3.5" />
            {t.presets[key]}
          </Button>
        ))}
      </div>
    </div>
  );
}
