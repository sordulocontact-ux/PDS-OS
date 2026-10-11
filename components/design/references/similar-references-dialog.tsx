"use client";

import { IconMagnifier } from "nucleo-sharp-essential";
import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { SimilarResults } from "@/components/design/references/similar-results";
import type { TargetOption } from "@/components/design/references/target-picker";
import { useSimilarSearch } from "@/components/design/references/use-similar-search";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProcessingSteps } from "@/components/ui/processing-steps";
import { ToneCallout } from "@/components/ui/tone-callout";
import { DIRECTION_TARGET } from "@/lib/design/reference-rules";
import { ALL_IMAGES, type SimilarSource } from "@/lib/design/similar-rules";
import { fr } from "@/lib/i18n/fr";

/** A moodboard PO can start from: the images of one target, or all of them. */
export type SimilarBase = { key: string; label: string; count: number };

type Props = {
  projectId: string;
  bases: SimilarBase[];
  options: TargetOption[];
  // From the server (similar-sources.ts): the sources on, whether PO reads
  // the moodboard, whether an Are.na link can be pasted.
  setup: { sources: SimilarSource[]; reads: boolean; arenaLink: boolean };
};

/** « Chercher des références semblables »: PO reads, the sources find, a human keeps. */
export function SimilarReferencesDialog(props: Props) {
  const t = fr.conceptionRefs.similar;
  const [open, setOpen] = useState(false);
  const names = t.and(props.setup.sources.map((s) => t.sources[s]));
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <IconMagnifier aria-hidden data-icon="inline-start" />
        {t.open}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.title}
        description={names ? t.description(names) : t.notConfigured}
        closeLabel={t.close}
        size="wide"
      >
        <SimilarSearchBody {...props} onDone={() => setOpen(false)} />
      </FormDialog>
    </>
  );
}

function SimilarSearchBody({
  projectId,
  bases,
  options,
  setup,
  onDone,
}: Props & { onDone: () => void }) {
  const t = fr.conceptionRefs.similar;
  const { reads, arenaLink } = setup;
  const names = t.and(setup.sources.map((s) => t.sources[s]));
  const { state, run, reset } = useSimilarSearch(projectId, reads);
  const [base, setBase] = useState(
    () =>
      bases.find((b) => b.key === DIRECTION_TARGET)?.key ??
      bases[0]?.key ??
      ALL_IMAGES,
  );
  // Kept across « Nouvelle recherche »: the same link is often tried again.
  const [link, setLink] = useState("");

  if (state.phase === "reading" || state.phase === "searching")
    return (
      <div role="status" aria-live="polite">
        <ProcessingSteps
          label={t.stepsLabel}
          doneLabel={t.stepDone}
          steps={[
            ...(reads
              ? [
                  {
                    key: "read",
                    label: t.stepRead,
                    state:
                      state.phase === "reading"
                        ? ("active" as const)
                        : ("done" as const),
                  },
                ]
              : []),
            {
              key: "search",
              label: t.stepSearch(names),
              state: state.phase === "searching" ? "active" : "waiting",
            },
          ]}
        />
      </div>
    );

  if (state.phase === "results")
    return (
      <SimilarResults
        projectId={projectId}
        look={state.look}
        groups={state.groups}
        options={options}
        // Kept images serve the moodboard they come from.
        initialTargets={base === ALL_IMAGES ? [DIRECTION_TARGET] : [base]}
        onAgain={reset}
        onDone={onDone}
      />
    );

  const cancel = (
    <Button type="button" variant="ghost" size="lg" onClick={onDone}>
      {fr.conceptionRefs.add.cancel}
    </Button>
  );
  if (setup.sources.length === 0)
    return (
      <>
        <ToneCallout tone="warning">{t.notConfigured}</ToneCallout>
        <div className="flex justify-end">{cancel}</div>
      </>
    );
  // Nothing to start from: no image to read, no Are.na link to paste.
  const startable = bases.length > 0 || arenaLink;

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        void run(base, link);
      }}
    >
      {bases.length > 0 ? (
        <div
          role="group"
          aria-label={t.baseLegend}
          className="flex flex-col gap-2"
        >
          <span className="text-sm font-medium">{t.baseLegend}</span>
          <div className="flex flex-wrap gap-2">
            {bases.map((b) => (
              <FilterChip
                key={b.key}
                pressed={base === b.key}
                onClick={() => setBase(b.key)}
              >
                {t.baseCount(b.label, b.count)}
              </FilterChip>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t.noImage}</p>
      )}

      {arenaLink && (
        <div className="flex flex-col gap-1.5">
          {!reads && (
            <p className="text-sm text-muted-foreground">{t.rebound}</p>
          )}
          <Label htmlFor="similar-arena-link">{t.linkLabel}</Label>
          <Input
            id="similar-arena-link"
            type="url"
            inputMode="url"
            maxLength={500}
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder={t.linkPlaceholder}
            aria-describedby="similar-arena-link-hint"
          />
          <p
            id="similar-arena-link-hint"
            className="text-sm text-muted-foreground"
          >
            {t.linkHint}
          </p>
        </div>
      )}

      {state.error && <FormMessage kind="error">{state.error}</FormMessage>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {cancel}
        {startable && (
          <Button type="submit" size="lg">
            {t.search}
          </Button>
        )}
      </div>
    </form>
  );
}
