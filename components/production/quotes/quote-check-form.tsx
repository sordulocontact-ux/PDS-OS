"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { DecisionPanel } from "@/components/ui/decision-panel";
import { productionQuotes } from "@/lib/i18n/fr/production-quotes";
import {
  requestQuoteChanges,
  submitQuote,
} from "@/lib/production/quotes/actions";
import {
  TICKED_CHECKS,
  type QuoteComputed,
} from "@/lib/production/quotes/check";

const fr = { productionQuotes };

const t = fr.productionQuotes.check;

/**
 * « Vérifier le devis Vn » (the line producer, proto): the amount against
 * the envelope and the places' amount, computed by code; the delays and the
 * posts to tick; « Soumettre à … » or « Demander une modification » with a
 * comment the company reads.
 */
export function QuoteCheckForm({
  projectId,
  quoteId,
  number,
  computed,
  delayText,
  validatorName,
  companyName,
}: {
  projectId: string;
  quoteId: string;
  number: number;
  computed: QuoteComputed[];
  delayText: string;
  validatorName: string;
  companyName: string;
}) {
  const [ticked, setTicked] = useState<string[]>([]);
  const [missing, setMissing] = useState(false);
  const label = (k: (typeof TICKED_CHECKS)[number]) =>
    k === "delay" ? delayText : t.scope;
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-semibold">{t.title(number)}</h3>
      <ul className="flex flex-col gap-1.5">
        {computed.map((c) => (
          <li
            key={c.text}
            className={
              c.ok === false
                ? "text-[color:var(--tone-danger-fg)]"
                : c.ok
                  ? "text-[color:var(--tone-success-fg)]"
                  : "text-[color:var(--text-secondary)]"
            }
          >
            {c.ok === false ? "✕" : c.ok ? "✓" : "○"} {c.text}{" "}
            {c.source && (
              <span className="text-[length:var(--type-micro)] text-[color:var(--text-tertiary)]">
                {c.source}
              </span>
            )}
          </li>
        ))}
      </ul>
      <DecisionPanel
        id={`quote-check-${quoteId}`}
        title={null}
        commentLabel={t.comment}
        commentHint={t.commentHint}
        commentRequired={t.commentRequired(companyName)}
        fields={
          <div className="flex flex-col gap-2">
            {TICKED_CHECKS.map((k) => (
              <CheckboxField
                key={k}
                label={label(k)}
                checked={ticked.includes(k)}
                onChange={(on) => {
                  setMissing(false);
                  setTicked((all) =>
                    on ? [...all, k] : all.filter((x) => x !== k),
                  );
                }}
              />
            ))}
            {missing && <FormMessage kind="error">{t.incomplete}</FormMessage>}
          </div>
        }
        check={(kind) => {
          if (kind !== "approve") return true;
          const ok = TICKED_CHECKS.every((k) => ticked.includes(k));
          setMissing(!ok);
          return ok;
        }}
        outcomes={[
          { kind: "approve", label: t.submit(validatorName) },
          { kind: "request_changes", label: t.changes },
        ]}
        onDecide={(kind, comment) =>
          kind === "approve"
            ? submitQuote({
                projectId,
                quoteId,
                number,
                checks: ["amount", ...TICKED_CHECKS],
                note: comment,
              })
            : requestQuoteChanges({ projectId, quoteId, number, comment })
        }
      />
    </section>
  );
}
