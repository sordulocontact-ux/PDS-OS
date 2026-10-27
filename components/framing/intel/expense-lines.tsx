"use client";

import { useState } from "react";

import { BudgetLineSheet } from "@/components/budget/budget-line-sheet";
import { Button } from "@/components/ui/button";
import { formatEuros } from "@/lib/budget/types";
import type { KnownBudgetLine } from "@/lib/framing/knowledge";
import { budget } from "@/lib/i18n/fr/budget";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";

const fr = { framingIntel, budget };

/**
 * Under « Engagements existants » (PROJ-UX-05): the project's expenses as
 * the Budget records them — several, each with its label, amount and status
 * — and « Ajouter une dépense » with the Budget's own form. The answer is
 * then proposed from them, to confirm.
 */
export function ExpenseLines({
  projectId,
  lines,
  editable,
}: {
  projectId: string;
  lines: KnownBudgetLine[];
  editable: boolean;
}) {
  const t = fr.framingIntel.expenses;
  const statuses = fr.budget.statuses as Record<string, string>;
  const [open, setOpen] = useState(false);
  return (
    <section className="flex flex-col gap-3 border-t border-[color:var(--border-hairline)] pt-4">
      <h4 className="text-caption font-semibold text-muted-foreground">
        {t.title}
      </h4>
      {lines.length === 0 ? (
        <p className="text-body-md text-muted-foreground">{t.empty}</p>
      ) : (
        <ul className="flex flex-col gap-1 text-body-md">
          {lines.map((line, index) => (
            <li
              key={`${line.label}-${index}`}
              className="flex flex-wrap justify-between gap-x-4"
            >
              <span className="break-words">{line.label}</span>
              <span className="text-muted-foreground tabular-nums">
                {formatEuros(line.amountCents)} ·{" "}
                {statuses[line.status] ?? line.status}
              </span>
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <Button
          variant="outline"
          className="self-start"
          onClick={() => setOpen(true)}
        >
          {t.add}
        </Button>
      )}
      <BudgetLineSheet
        projectId={projectId}
        line={null}
        levers={[]}
        open={open}
        onOpenChange={setOpen}
      />
    </section>
  );
}
