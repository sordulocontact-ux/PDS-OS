"use client";

import { useState } from "react";

import { SummarySectionCard } from "@/components/design/direction/summary-section-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RequestReviewDialog } from "@/components/design/request-review-dialog";
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
 * submit, then confirms on the request (MKT-C2-11: every section named,
 * the version, who decides, a message and a date). The database writes
 * the version.
 */
export function DirectionSubmitForm({
  projectId,
  sections,
  canSubmit,
  blocked,
  globalMissing,
  validatorNames,
  modeLabel,
  nextVersion,
  today,
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
  // The number the version will have, and today (Paris) for the due date.
  nextVersion: number;
  today: string;
}) {
  const t = fr.conceptionDirection.summary;
  const [selected, setSelected] = useState(
    () => new Set(sections.filter(hasContent).map((s) => s.key)),
  );
  const [confirming, setConfirming] = useState(false);
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
            disabled={Boolean(blocked) || chosen.length === 0}
            onClick={() => setConfirming(true)}
          >
            {fr.conceptionRequests.submitTo(validatorNames)}
          </Button>
        </div>
      )}
      <RequestReviewDialog
        open={confirming}
        onOpenChange={setConfirming}
        object={fr.conceptionRequests.directionObject}
        version={nextVersion}
        sections={chosen.map((s) => s.title ?? t.direction)}
        validators={validatorNames}
        modeLabel={modeLabel}
        today={today}
        done={t.submitted}
        run={(note) =>
          submitDesignDirection(
            projectId,
            chosen.map((s) => s.key),
            note,
          )
        }
      />
    </div>
  );
}
