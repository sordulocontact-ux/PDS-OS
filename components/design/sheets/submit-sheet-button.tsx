"use client";

import { useState } from "react";

import { RequestReviewDialog } from "@/components/design/request-review-dialog";
import { Button } from "@/components/ui/button";
import { submitDesignSheet } from "@/lib/design/actions/sheet-review";
import { fr } from "@/lib/i18n/fr";

/**
 * « Soumettre à … » a Fiche Livrable (MKT-C2-11): the button says to whom,
 * the request says what leaves — the sheet and each content of a series,
 * the version, who decides and how, a message and a date —, then the sheet
 * is frozen until the validators decide. Held while something blocks (« PO
 * signale »); the database checks the rest.
 */
export function SubmitSheetButton({
  projectId,
  sheetId,
  blocked,
  title,
  nextVersion,
  sections,
  modeLabel,
  validatorNames,
  today,
}: {
  projectId: string;
  sheetId: string;
  blocked: boolean;
  title: string;
  nextVersion: number;
  sections: string[];
  modeLabel: string;
  validatorNames: string;
  today: string;
}) {
  const t = fr.conceptionSheet.review;
  const r = fr.conceptionRequests;
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <Button
        size="lg"
        className="self-start"
        disabled={blocked}
        aria-describedby={blocked ? "sheet-submit-blocked" : undefined}
        onClick={() => setOpen(true)}
      >
        {r.submitTo(validatorNames)}
      </Button>
      {blocked && (
        <p
          id="sheet-submit-blocked"
          className="text-caption text-muted-foreground"
        >
          {t.blocked}
        </p>
      )}
      <RequestReviewDialog
        open={open}
        onOpenChange={setOpen}
        object={r.sheetObject(title)}
        version={nextVersion}
        sections={sections}
        validators={validatorNames}
        modeLabel={modeLabel}
        today={today}
        done={t.submitted}
        run={(note) => submitDesignSheet(projectId, sheetId, note)}
      />
    </div>
  );
}
