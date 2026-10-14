"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import { decideQuote } from "@/lib/production/quotes/actions";

const t = fr.productionQuotes.decide;

/** The validator's decision: « Valider le devis », or « Refuser » with a
 * reason the depositor reads. */
export function QuoteDecisionForm({
  projectId,
  quoteId,
}: {
  projectId: string;
  quoteId: string;
}) {
  const [reason, setReason] = useState("");
  const [missing, setMissing] = useState(false);
  const approve = useWriteSubmit(() => undefined, t.approved);
  const reject = useWriteSubmit(() => undefined, t.rejected);
  const pending = approve.pending || reject.pending;
  return (
    <div className="flex flex-col gap-4">
      <TextareaField
        name="reason"
        label={t.reason}
        placeholder={t.reasonPlaceholder}
        rows={2}
        maxLength={1000}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        error={missing ? t.reasonRequired : undefined}
      />
      {(approve.error || reject.error) && (
        <FormMessage kind="error">{approve.error ?? reject.error}</FormMessage>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={pending}
          aria-busy={approve.pending || undefined}
          onClick={() =>
            approve.run(() =>
              decideQuote({ projectId, quoteId, approve: true, reason: "" }),
            )
          }
        >
          {t.approve}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          aria-busy={reject.pending || undefined}
          onClick={() => {
            setMissing(!reason.trim());
            if (!reason.trim()) return;
            reject.run(() =>
              decideQuote({ projectId, quoteId, approve: false, reason }),
            );
          }}
        >
          {t.reject}
        </Button>
      </div>
    </div>
  );
}
