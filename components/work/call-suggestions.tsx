"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Rows } from "@/components/ui/rows";
import { toast } from "@/components/ui/toast";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { work } from "@/lib/i18n/fr/work";
import { formatShortDay } from "@/lib/utils/day";
import type { CallSuggestion } from "@/lib/work/call-suggestions";
import {
  acceptCallSuggestion,
  dismissCallSuggestion,
} from "@/lib/work/personal-task-actions";

const fr = { work };

/**
 * « Suggérées par vos réunions »: the next actions the AI found in the
 * viewer's recent meetings, each with its meeting and the sentence it comes
 * from; « Ajouter » makes it a task of « Mes tâches », « Ignorer » sets it
 * aside. A person decides, never PO alone. Nothing shows without one.
 */
export function CallSuggestions({
  suggestions,
  onAnswered,
}: {
  suggestions: CallSuggestion[];
  onAnswered: () => void;
}) {
  const t = fr.work.tasks.suggestions;
  const [answered, setAnswered] = useState<Set<string>>(() => new Set());
  const [, startTransition] = useTransition();
  const shown = suggestions.filter((s) => !answered.has(s.itemId));
  if (shown.length === 0) return null;

  const answer = (suggestion: CallSuggestion, add: boolean) => {
    setAnswered((prev) => new Set(prev).add(suggestion.itemId));
    startTransition(async () => {
      const res = add
        ? await acceptCallSuggestion(suggestion.itemId)
        : await dismissCallSuggestion(suggestion.itemId);
      if (!res.ok) {
        toast.error(fr.work.tasks.failed);
        setAnswered((prev) => {
          const next = new Set(prev);
          next.delete(suggestion.itemId);
          return next;
        });
        return;
      }
      if (add) toast.success(t.added);
      onAnswered();
    });
  };

  return (
    <section aria-label={t.title} className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-semibold">
          {t.title}{" "}
          <span className="font-normal text-muted-foreground tabular-nums">
            {shown.length}
          </span>
        </h2>
        <p className="text-xs text-muted-foreground">{t.hint}</p>
      </div>
      <Rows label={t.title}>
        {shown.map((suggestion) => (
          <li
            key={suggestion.itemId}
            className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm font-medium break-words">
                {suggestion.what}
              </span>
              <span className="text-xs text-muted-foreground">
                <ViewLink
                  href={routes.call(suggestion.callId)}
                  className="underline-offset-2 hover:underline"
                >
                  {fr.work.tasks.fromCall(suggestion.callTitle)}
                </ViewLink>
                {" · "}
                {formatShortDay(suggestion.occurredAt, { bare: true })}
              </span>
              {suggestion.quote && (
                <span className="text-xs break-words text-muted-foreground italic">
                  {t.said(suggestion.quote)}
                </span>
              )}
            </span>
            <span className="flex shrink-0 gap-1">
              <Button
                size="sm"
                variant="outline"
                aria-label={t.addLabel(suggestion.what)}
                onClick={() => answer(suggestion, true)}
              >
                {t.add}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                aria-label={t.dismissLabel(suggestion.what)}
                onClick={() => answer(suggestion, false)}
              >
                {t.dismiss}
              </Button>
            </span>
          </li>
        ))}
      </Rows>
    </section>
  );
}
