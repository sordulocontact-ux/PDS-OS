"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import { submitQuote } from "@/lib/production/quotes/actions";
import type { QuoteCheck, QuoteCheckKey } from "@/lib/production/quotes/check";

const t = fr.productionQuotes.check;

/** The line producer's check: each point PO prepared ticked « Vérifié »,
 * a note for the validator, then « Soumettre ». */
export function QuoteCheckForm({
  projectId,
  quoteId,
  checks,
  validatorName,
}: {
  projectId: string;
  quoteId: string;
  checks: QuoteCheck[];
  validatorName: string;
}) {
  const [ticked, setTicked] = useState<QuoteCheckKey[]>([]);
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const { pending, error, run } = useWriteSubmit(() => undefined, t.submitted);
  const left = checks.length - ticked.length;
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {checks.map((c) => (
          <li
            key={c.key}
            className="flex items-start gap-3 rounded-lg bg-[var(--surface-soft)] px-3 py-2.5"
          >
            <span
              aria-hidden
              className={
                c.ok === false
                  ? "mt-0.5 text-[color:var(--tone-warning-fg)]"
                  : c.ok
                    ? "mt-0.5 text-[color:var(--tone-success-fg)]"
                    : "mt-0.5 text-muted-foreground"
              }
            >
              {c.ok === false ? "!" : c.ok ? "✓" : "○"}
            </span>
            <span className="min-w-0 flex-1 text-sm">{c.text}</span>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={ticked.includes(c.key)}
                onChange={(event) => {
                  const on = event.currentTarget.checked;
                  setTicked((all) =>
                    on ? [...all, c.key] : all.filter((k) => k !== c.key),
                  );
                }}
              />
              {t.verified}
            </label>
          </li>
        ))}
      </ul>
      <TextareaField
        name="note"
        label={t.noteLabel}
        placeholder={t.notePlaceholder}
        rows={2}
        maxLength={1000}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {tried && left > 0 && (
        <FormMessage kind="error">{t.incomplete(left)}</FormMessage>
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div>
        <Button
          type="button"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={() => {
            setTried(true);
            if (left > 0) return;
            run(() =>
              submitQuote({ projectId, quoteId, checks: ticked, note }),
            );
          }}
        >
          {t.submit(validatorName)}
        </Button>
      </div>
    </div>
  );
}
