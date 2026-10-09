"use client";

import { useState } from "react";

import { ThemeFields } from "@/components/strategy/generator/theme-fields";
import { useDraftSave } from "@/components/strategy/generator/use-draft-save";
import { useImagePalette } from "@/components/strategy/generator/use-image-palette";
import { Swatches } from "@/components/strategy/generator/swatches";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fr } from "@/lib/i18n/fr";
import {
  DEFAULT_ACCENT,
  type Direction,
  type Theme,
} from "@/lib/strategy/documents/model";

/**
 * Step 5 (ticket § 11): a direction for the document, proposed from the
 * selected references (their light, colour and palette, read by code in the
 * browser). Valider, Modifier, or Voir une autre proposition.
 */
export function DirectionStep({
  projectId,
  imageUrls,
  saved,
  nextHref,
}: {
  projectId: string;
  imageUrls: string[];
  saved: Direction | undefined;
  nextHref: string;
}) {
  const t = fr.strategyDocs.plan;
  const g = fr.strategyDocs.generator;
  const { pending, save } = useDraftSave(projectId, "release_plan");
  const reading = useImagePalette(imageUrls);
  const [index, setIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [manual, setManual] = useState<{ theme: Theme; accent: string } | null>(
    saved ? { theme: saved.theme, accent: saved.accent } : null,
  );

  const proposed: { theme: Theme; accent: string } | null = reading
    ? {
        theme: reading.themes[index % reading.themes.length],
        accent: reading.accent ?? DEFAULT_ACCENT,
      }
    : null;
  const shown = manual ?? proposed;
  const palette = saved?.palette ?? reading?.palette ?? [];

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-display-sm font-semibold">{t.directionTitle}</h2>
        <p className="max-w-prose text-body-md text-muted-foreground">
          {t.directionBody}
        </p>
      </div>

      {!shown ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : editing ? (
        <ThemeFields
          idPrefix="plan-direction"
          theme={shown.theme}
          accent={shown.accent}
          onChange={setManual}
        />
      ) : (
        <div className="flex flex-col gap-4 rounded-2xl border border-border p-5">
          <div className="flex flex-col gap-1">
            <p className="text-body-lg font-semibold">
              {t.themes[shown.theme].name}
            </p>
            <p className="text-body-md text-muted-foreground">
              {t.themes[shown.theme].body}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-caption text-muted-foreground">
              {t.accent}
              {reading?.accent && !manual ? ` · ${t.accentFromImage}` : ""}
            </p>
            <Swatches colors={[shown.accent]} />
          </div>
          {palette.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-caption text-muted-foreground">{t.palette}</p>
              <Swatches colors={palette} />
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={pending || !shown}
          onClick={() =>
            shown &&
            save({ direction: { ...shown, palette, accepted: true } }, nextHref)
          }
        >
          {pending ? g.saving : g.validate}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!shown}
          onClick={() => {
            if (shown) setManual(shown);
            setEditing((v) => !v);
          }}
        >
          {editing ? g.done : g.edit}
        </Button>
        {!editing && (
          <Button
            type="button"
            variant="ghost"
            disabled={!reading}
            onClick={() => {
              setManual(null);
              setIndex((i) => i + 1);
            }}
          >
            {t.another}
          </Button>
        )}
      </div>
    </section>
  );
}
