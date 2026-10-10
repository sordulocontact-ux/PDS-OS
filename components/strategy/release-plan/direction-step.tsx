"use client";

import { useState } from "react";

import { DirectionCard } from "@/components/strategy/release-plan/direction-card";
import { DirectionEditor } from "@/components/strategy/release-plan/direction-editor";
import { useDraftSave } from "@/components/strategy/release-plan/use-draft-save";
import { useImageReading } from "@/components/strategy/release-plan/use-image-reading";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import type { GeneratorKind } from "@/lib/strategy/documents/generator-kind";
import {
  proposeDirection,
  type Direction,
} from "@/lib/strategy/documents/direction";

/**
 * Step 5 (ticket § 11): the moodboard and the document's direction, proposed
 * from the references the owner allowed (lib/strategy/documents/direction:
 * the proposer can change without this screen changing). Valider, Modifier,
 * Voir une autre proposition.
 */
export function DirectionStep({
  projectId,
  imageUrls,
  saved,
  nextHref,
  canEdit,
  kind = "release_plan",
}: {
  projectId: string;
  // The document whose draft keeps the choice.
  kind?: GeneratorKind;
  imageUrls: string[];
  saved: Direction | undefined;
  nextHref: string;
  canEdit: boolean;
}) {
  const t = fr.strategyReleasePlan.direction;
  const a = fr.strategyReleasePlan.actions;
  const { pending, save } = useDraftSave(projectId, kind);
  const reading = useImageReading(imageUrls);
  const [seed, setSeed] = useState(saved?.seed ?? 0);
  const [own, setOwn] = useState<Direction | null>(saved ?? null);
  const [editing, setEditing] = useState(false);
  // The owner's direction once validated or modified; else the proposal.
  const proposal = reading ? proposeDirection(reading, seed) : null;
  const shown = own && own.seed === seed ? own : proposal;

  return (
    <section aria-labelledby="direction-title" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 id="direction-title" className="text-display-sm font-semibold">
          {t.title}
        </h2>
        <p className="max-w-prose text-body-md text-muted-foreground">
          {t.body}
        </p>
      </div>
      {imageUrls.length === 0 && (
        <ToneCallout tone="neutral">{t.noImages}</ToneCallout>
      )}
      {imageUrls.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {imageUrls.slice(0, 6).map((url) => (
            <li key={url}>
              {/* eslint-disable-next-line @next/next/no-img-element -- signed URL, public bucket or reference */}
              <img
                src={url}
                alt=""
                className="aspect-square w-full rounded-xl bg-muted object-cover"
              />
            </li>
          ))}
        </ul>
      )}
      {shown && (
        <DirectionCard direction={shown} label={t.proposal(seed + 1)} />
      )}
      {canEdit && shown && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              const accepted = { ...shown, accepted: true };
              setOwn(accepted);
              save({ direction: accepted }, nextHref);
            }}
          >
            {pending ? a.saving : a.validate}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setEditing(true)}
          >
            {a.edit}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setOwn(null);
              setSeed((s) => (s + 1) % 1000);
            }}
          >
            {t.another}
          </Button>
        </div>
      )}
      {shown && (
        <FormDialog
          open={editing}
          onOpenChange={setEditing}
          title={t.title}
          description={t.body}
          closeLabel={a.cancel}
        >
          <DirectionEditor
            initial={shown}
            pending={pending}
            onCancel={() => setEditing(false)}
            onSave={(direction) => {
              setOwn(direction);
              setEditing(false);
              save({ direction }, nextHref);
            }}
          />
        </FormDialog>
      )}
    </section>
  );
}
