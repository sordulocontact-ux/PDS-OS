"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { ChipChoice } from "@/components/ui/chip-choice";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { VersionCard } from "@/components/ui/version-card";
import { isReasonKind, type ReasonKind } from "@/lib/distribution/closure";
import { proposeClosure } from "@/lib/distribution/closure-gestures";
import { distribution } from "@/lib/i18n/fr/distribution";
import { distributionJourney } from "@/lib/i18n/fr/distribution-journey";

const fr = { distribution, distributionJourney };

const t = fr.distributionJourney.closure;
const c = fr.distribution.closure;

/** « Arrêter la distribution »: cancelled or abandoned, a reason and its
 * motive, decided by the direction (recette DIST-003). */
export function StopDistribution({ projectId }: { projectId: string }) {
  const [kind, setKind] = useState<"cancelled" | "abandoned" | null>(null);
  const [reasonKind, setReasonKind] = useState<ReasonKind | null>(null);
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const label = kind ? c.kinds[kind] : "";
  const { pending, error, run } = useWriteSubmit(
    () => setTried(false),
    t.stopProposed(label),
  );
  const submit = () => {
    setTried(true);
    if (!kind || !reasonKind || !note.trim()) return;
    run(() =>
      proposeClosure({
        projectId,
        kind,
        arbitration: note.trim(),
        acknowledged: true,
        reasonKind,
        reserves: [],
        done: t.stopProposed(label),
      }),
    );
  };
  return (
    <VersionCard title={t.stopTitle}>
      <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
        {t.stopBody}
      </p>
      <ChipChoice
        name="stop-kind"
        legend={t.stopKind}
        required
        options={(["cancelled", "abandoned"] as const).map((value) => ({
          value,
          label: t.stopKinds[value],
        }))}
        value={kind}
        onChange={setKind}
        error={tried && !kind ? t.reasonKindRequired : undefined}
      />
      <OptionSelect
        name="stop-reason-kind"
        label={t.reasonKind}
        required
        items={c.reasonKinds}
        onValueChange={(value) =>
          setReasonKind(isReasonKind(value) ? value : null)
        }
        error={tried && !reasonKind ? t.reasonKindRequired : undefined}
      />
      <TextareaField
        name="stop-note"
        label={t.stopReason}
        required
        rows={2}
        maxLength={2000}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        error={tried && !note.trim() ? t.stopReasonRequired : undefined}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <div>
        <Button
          variant="outline"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={submit}
        >
          {kind ? t.stopSubmit(label) : t.stopTitle}
        </Button>
      </div>
    </VersionCard>
  );
}
