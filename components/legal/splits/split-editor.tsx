"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useEffect, useRef, useState, useTransition } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { SplitEditorRow } from "@/components/legal/splits/split-editor-row";
import { SplitParts } from "@/components/legal/splits/split-parts";
import { SplitPublishingRow } from "@/components/legal/splits/split-publishing-row";
import { useSplitDraft } from "@/components/legal/splits/use-split-draft";
import { StepSection } from "@/components/shell/journey/step-section";
import { Button } from "@/components/ui/button";
import { FactRows } from "@/components/ui/fact-row";
import { legalSplits } from "@/lib/i18n/fr/legal-splits";
import { saveSplitDraft } from "@/lib/legal/splits/actions";
import {
  draftErrors,
  entriesOf,
  type DraftErrors,
  type PublishingHint,
} from "@/lib/legal/splits/draft";
import type { SplitLine } from "@/lib/legal/splits/queries";

const fr = { legalSplits };

/**
 * A title's split (recette Juridique V1, JUR-01), in three distinct
 * sections: who created what, who publishes each creator's share, then the
 * parts of the work — one per creator and per publisher, typed by a
 * person, never proposed. Misses are shown on « Enregistrer » only, each on
 * its field, counted above the button, focus on the first; the database
 * checks the exact 100 % and whom each publisher represents again.
 */
export function SplitEditor({
  projectId,
  masterId,
  initial,
  hints,
  version,
  onDone,
  onCancel,
}: {
  projectId: string;
  masterId: string;
  initial: SplitLine[];
  hints: Record<string, PublishingHint>;
  // The version this one follows: why it changes is asked.
  version: number | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = fr.legalSplits.editor;
  const s = useSplitDraft(masterId, initial, hints);
  const { draft } = s;
  const [errors, setErrors] = useState<DraftErrors | null>(null);
  const [tried, setTried] = useState(0);
  const [failure, setFailure] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();
  const withNote = version !== null;
  // Once tried, the errors follow what is corrected.
  const shown = errors ? draftErrors(draft, withNote) : null;

  useEffect(() => {
    if (!tried) return;
    root.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus({ preventScroll: false });
  }, [tried]);

  function save() {
    setFailure(null);
    const found = draftErrors(draft, withNote);
    setErrors(found);
    if (found.count > 0) return setTried((n) => n + 1);
    startTransition(async () => {
      const result = await saveSplitDraft({
        projectId,
        masterId,
        note: draft.note,
        lines: entriesOf(draft),
      });
      if (!result.ok) return setFailure(result.error);
      onDone();
    });
  }

  return (
    <div ref={root} className="flex flex-col gap-3.5 modern:gap-4">
      <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
        {t.intro}
      </p>
      <StepSection title={t.creators}>
        <ul className="flex flex-col gap-3">
          {draft.creators.map((creator) => (
            <SplitEditorRow
              key={creator.key}
              row={creator}
              load={s.people}
              canRemove={draft.creators.length > 1}
              errors={shown?.creators[creator.key] ?? null}
              onPick={(change) => s.pickCreator(creator.key, change)}
              onChange={(change) => s.setCreator(creator.key, change)}
              onRemove={() => s.remove(creator.key)}
            />
          ))}
        </ul>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={s.add}
        >
          <IconPlus aria-hidden />
          {t.add}
        </Button>
        <p className="text-caption text-muted-foreground">{t.creatorsBody}</p>
      </StepSection>
      <StepSection title={t.publishing}>
        <FactRows>
          {draft.creators.map((creator) => (
            <SplitPublishingRow
              key={creator.key}
              creator={creator}
              load={s.publishers}
              errors={shown?.creators[creator.key] ?? null}
              onChange={(change) => s.setCreator(creator.key, change)}
            />
          ))}
        </FactRows>
      </StepSection>
      <StepSection title={t.parts} description={t.partsBody}>
        <SplitParts
          draft={draft}
          errors={shown}
          onCreator={(key, share) => s.setCreator(key, { share })}
          onPublisher={s.setPublisherShare}
        />
      </StepSection>
      {withNote && (
        <Field
          name="note"
          label={t.note}
          aria-required
          maxLength={2000}
          placeholder={t.notePlaceholder(version)}
          value={draft.note}
          error={shown?.note ?? undefined}
          onChange={(event) => s.setNote(event.target.value)}
        />
      )}
      <FormMessage kind="error">
        {failure ??
          (shown && shown.count > 0 ? t.missingCount(shown.count) : null)}
      </FormMessage>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          {fr.legalSplits.public.cancel}
        </Button>
        <Button
          type="button"
          size="lg"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={save}
        >
          {pending ? t.saving : withNote ? t.saveNew : t.save}
        </Button>
      </div>
    </div>
  );
}
