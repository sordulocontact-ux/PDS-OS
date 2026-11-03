"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toast";

import { FormMessage } from "@/components/auth/form-message";
import { SimilarImageTile } from "@/components/design/references/similar-image-tile";
import {
  TargetPicker,
  type TargetOption,
} from "@/components/design/references/target-picker";
import { EmptyNote } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { ToneCallout } from "@/components/ui/tone-callout";
import { keepSimilarImage } from "@/lib/design/actions/reference-similar";
import { similarKey, type SimilarGroup } from "@/lib/design/similar-rules";
import { conceptionRefs } from "@/lib/i18n/fr/conception-refs";

const fr = { conceptionRefs };

/**
 * What PO saw, where the images come from as pills (an Are.na channel, an
 * Openverse search; unticking one hides its images), the images to tick,
 * and the targets they will serve. Kept one after the other: each is read
 * again at its source, stored, then recorded.
 */
export function SimilarResults({
  projectId,
  look,
  groups,
  options,
  initialTargets,
  onAgain,
  onDone,
}: {
  projectId: string;
  look: string | null;
  groups: SimilarGroup[];
  options: TargetOption[];
  initialTargets: string[];
  onAgain: () => void;
  onDone: () => void;
}) {
  const t = fr.conceptionRefs.similar;
  const [shown, setShown] = useState(() => new Set(groups.map((g) => g.key)));
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [targets, setTargets] = useState(initialTargets);
  const [progress, setProgress] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const busy = progress !== null;

  const images = groups
    .filter((g) => shown.has(g.key))
    .flatMap((g) => g.images);
  const total = groups.reduce((n, g) => n + g.images.length, 0);
  // Only what is on screen is kept: a hidden search drops its ticks.
  const keyOf = (image: (typeof images)[number]) =>
    similarKey(image.source, image.id);
  const chosen = images.filter((image) => picked.has(keyOf(image)));

  const toggle = (set: Set<string>, key: string, on: boolean) => {
    const next = new Set(set);
    if (on) next.add(key);
    else next.delete(key);
    return next;
  };

  async function keep() {
    if (chosen.length === 0) return setErrors([t.pickFirst]);
    setErrors([]);
    const failed: string[] = [];
    const kept: string[] = [];
    let added = 0;
    for (const [index, image] of chosen.entries()) {
      setProgress(index + 1);
      const result = await keepSimilarImage({
        projectId,
        source: image.source,
        imageId: image.id,
        targets,
      });
      if (!result.ok) failed.push(result.error);
      else {
        kept.push(keyOf(image));
        if (result.deduped) toast.info(t.deduped);
        else added += 1;
      }
    }
    setProgress(null);
    // A retry after a failure only sends what is still missing.
    setPicked((set) => new Set([...set].filter((id) => !kept.includes(id))));
    if (added > 0) toast.success(t.added(added));
    if (failed.length) return setErrors([...new Set(failed)]);
    onDone();
  }

  return (
    <div className="flex flex-col gap-6" aria-busy={busy}>
      {look && (
        <ToneCallout tone="neutral">
          <span className="block text-sm text-muted-foreground">
            {t.lookLabel}
          </span>
          {look}
        </ToneCallout>
      )}

      {groups.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">{t.groupsLegend}</legend>
          <p className="text-sm text-muted-foreground">{t.groupsHint}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {groups.map((g) => (
              <FilterChip
                key={g.key}
                pressed={shown.has(g.key)}
                disabled={busy}
                onClick={() =>
                  setShown((set) => {
                    const next = new Set(set);
                    if (!next.delete(g.key)) next.add(g.key);
                    return next;
                  })
                }
              >
                <span translate="no">
                  {t.group(t.sources[g.source], g.label, g.images.length)}
                </span>
              </FilterChip>
            ))}
          </div>
        </fieldset>
      )}

      {total === 0 ? (
        <EmptyNote>{t.nothing}</EmptyNote>
      ) : images.length === 0 ? (
        <EmptyNote>{t.nothingShown}</EmptyNote>
      ) : (
        <ul
          aria-label={t.resultsLabel}
          className="grid max-h-[50vh] grid-cols-2 gap-3 overflow-y-auto overscroll-contain sm:grid-cols-3"
        >
          {images.map((image) => (
            <li key={keyOf(image)}>
              <SimilarImageTile
                image={image}
                checked={picked.has(keyOf(image))}
                disabled={busy}
                onCheckedChange={(on) =>
                  setPicked((set) => toggle(set, keyOf(image), on))
                }
              />
            </li>
          ))}
        </ul>
      )}

      {total > 0 && (
        <TargetPicker
          legend={t.targetsLegend}
          hint={t.targetsHint}
          options={options}
          value={targets}
          onChange={setTargets}
          disabled={busy}
        />
      )}

      {errors.map((error) => (
        <FormMessage key={error} kind="error">
          {error}
        </FormMessage>
      ))}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          disabled={busy}
          onClick={onAgain}
        >
          {t.again}
        </Button>
        {total > 0 && (
          <Button type="button" size="lg" disabled={busy} onClick={keep}>
            {busy ? t.adding(progress, chosen.length) : t.submit(chosen.length)}
          </Button>
        )}
      </div>
    </div>
  );
}
