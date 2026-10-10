import { Children } from "react";

import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import type { DecisionState } from "@/lib/production/delivery/rules";
import { deliveryDecisionTone } from "@/lib/ui/state-tones";

const t = fr.productionDelivery.decisions;

/** One of the three decisions before « Livré »: its state, who took it (or
 * why it cannot be taken yet), and the actions of whoever may take it. */
export function DecisionCard({
  number,
  title,
  state,
  summary,
  reasons,
  note,
  children,
}: {
  number: number;
  title: string;
  state: DecisionState;
  summary: React.ReactNode;
  // Why it is not possible yet, already worded by code.
  reasons: string[];
  note?: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium">
          {number}. {title}
        </h3>
        <StatusBadge tone={deliveryDecisionTone[state]}>
          {t.states[state]}
        </StatusBadge>
      </div>
      {summary && <p className="text-sm text-muted-foreground">{summary}</p>}
      {reasons.length > 0 && (
        <div className="flex flex-col gap-1 text-sm">
          <p className="font-medium">{t.blockedTitle}</p>
          <ul className="list-disc pl-5 text-muted-foreground">
            {reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
      {Children.toArray(children).length > 0 && (
        <div className="mt-auto flex flex-wrap items-center gap-2">
          {children}
        </div>
      )}
    </li>
  );
}
