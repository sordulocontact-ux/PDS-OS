"use client";

import { useState } from "react";

import { SummarySectionCard } from "@/components/design/direction/summary-section-card";
import { useDesignAction } from "@/components/design/work/use-design-action";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ToneCallout } from "@/components/ui/tone-callout";
import { submitDesignDirection } from "@/lib/design/actions/direction";
import {
  hasContent,
  type SummarySection,
} from "@/lib/design/direction-summary";
import { fr } from "@/lib/i18n/fr";

/**
 * The synthesis before sending (ticket § 7): every section with what it
 * carries and what is missing; the responsible ticks the sections to
 * submit, then confirms on a summary. The database writes the version.
 */
export function DirectionSubmitForm({
  projectId,
  sections,
  canSubmit,
  blocked,
  globalMissing,
  validatorNames,
  modeLabel,
}: {
  projectId: string;
  sections: SummarySection[];
  // The responsible or the owner, while the Conception is in progress.
  canSubmit: boolean;
  // Why nothing can leave now (a version waits, no validator), if so.
  blocked: string | null;
  globalMissing: string[];
  validatorNames: string;
  modeLabel: string;
}) {
  const t = fr.conceptionDirection.summary;
  const [selected, setSelected] = useState(
    () => new Set(sections.filter(hasContent).map((s) => s.key)),
  );
  const [confirming, setConfirming] = useState(false);
  const { pending, run } = useDesignAction();
  const chosen = sections.filter((s) => selected.has(s.key));

  const toggle = (key: string) =>
    setSelected((set) => {
      const next = new Set(set);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="flex flex-col gap-4">
      {globalMissing.map((sentence) => (
        <ToneCallout key={sentence} tone="warning">
          {sentence}
        </ToneCallout>
      ))}
      <ul className="flex flex-col gap-3">
        {sections.map((section) => (
          <li key={section.key}>
            <SummarySectionCard
              section={section}
              selected={canSubmit && selected.has(section.key)}
              select={
                canSubmit ? (
                  <Checkbox
                    size="md"
                    checked={selected.has(section.key)}
                    onChange={() => toggle(section.key)}
                    aria-label={t.select(section.title ?? t.direction)}
                  />
                ) : undefined
              }
            />
          </li>
        ))}
      </ul>
      {canSubmit && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {blocked && (
            <p className="text-body-md text-muted-foreground sm:mr-auto">
              {blocked}
            </p>
          )}
          <Button
            size="lg"
            disabled={Boolean(blocked) || chosen.length === 0 || pending}
            onClick={() => setConfirming(true)}
          >
            {t.submit}
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t.confirmTitle}
        description={t.confirmBody(chosen.length, validatorNames, modeLabel)}
        cancelLabel={t.cancel}
        closeLabel={t.close}
        confirmLabel={t.submit}
        pendingLabel={t.submitting}
        pending={pending}
        onConfirm={() =>
          run(
            () =>
              submitDesignDirection(
                projectId,
                chosen.map((s) => s.key),
              ),
            { success: t.submitted, onSuccess: () => setConfirming(false) },
          )
        }
      />
    </div>
  );
}
