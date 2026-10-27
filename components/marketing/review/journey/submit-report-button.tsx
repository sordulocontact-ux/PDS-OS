"use client";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { reviewJourney } from "@/lib/i18n/fr/review-journey";
import { submitReport } from "@/lib/marketing/reports/approval-actions";

const fr = { reviewJourney };

/** « Soumettre à Claire Morel » (proto `bsubmit`): straight, no confirm. */
export function SubmitReportButton({
  projectId,
  reportId,
  label,
}: {
  projectId: string;
  reportId: string;
  label: string;
}) {
  const { pending, error, run } = useWriteSubmit(
    () => undefined,
    fr.reviewJourney.bilan.submitted,
  );
  return (
    <div className="flex flex-col gap-2">
      <FormMessage kind="error">{error}</FormMessage>
      <div>
        <Button
          type="button"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={() => run(() => submitReport({ projectId, reportId }))}
        >
          {label}
        </Button>
      </div>
    </div>
  );
}
