"use client";

import { useState } from "react";

import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { legalForms } from "@/lib/i18n/fr/legal-forms";
import { missingLabels } from "@/lib/legal/forms/state";

const fr = { legalForms };

const t = fr.legalForms.page;

/**
 * A received fiche that misses what the contract needs (JUR-06): what is
 * missing, the message for the person (pre-filled, editable) and
 * « Redemander ce qui manque »; their private link then shows only those
 * fields. It is never validated as it is.
 */
export function ComplementRequest({
  name,
  missing,
  pending,
  onAsk,
  emailed = false,
}: {
  name: string;
  missing: string[];
  pending: boolean;
  onAsk: (note: string) => void;
  // PDS OS e-mails the message itself.
  emailed?: boolean;
}) {
  const labels = missingLabels(missing);
  const [note, setNote] = useState(() =>
    t.askMessageDefault(name.split(" ")[0] ?? name, labels),
  );
  return (
    <div className="flex flex-col gap-3">
      <ToneCallout tone="warning">{t.receivedIncomplete(labels)}</ToneCallout>
      <TextareaField
        id="complement-note"
        name="complement-note"
        label={t.askMessage}
        hint={emailed ? t.askHintEmailed : t.askHint}
        rows={3}
        maxLength={2000}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <Button
        className="self-start"
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={() => onAsk(note)}
      >
        {t.ask}
      </Button>
    </div>
  );
}
