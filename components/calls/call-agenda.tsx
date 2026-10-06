"use client";

import { useState } from "react";
import { IconTrash } from "nucleo-sharp-essential";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateCallAgenda } from "@/lib/calls/actions";
import type { AgendaItem } from "@/lib/calls/first-call-agenda";
import { fr } from "@/lib/i18n/fr";

/**
 * Points to cover and their approximate time, prepared before the call.
 * Editable (add, rename, retime, remove a point) until the call is recorded;
 * the total is always the sum of the points, never typed by hand.
 */
export function CallAgenda({
  callId,
  agenda,
  durationMinutes,
  canEdit,
}: {
  callId: string;
  agenda: AgendaItem[];
  durationMinutes: number | null;
  canEdit: boolean;
}) {
  const t = fr.calls.agenda;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(agenda);
  const [pending, setPending] = useState(false);

  if (!editing) {
    return (
      <div className="grid gap-3 rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-medium">{t.title}</h3>
          {canEdit && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft(agenda);
                setEditing(true);
              }}
            >
              {t.edit}
            </Button>
          )}
        </div>
        {durationMinutes !== null && (
          <p className="text-xs text-muted-foreground">
            {t.total(durationMinutes)}
          </p>
        )}
        <ol className="grid list-decimal gap-2 pl-5 text-sm">
          {agenda.map((item, index) => (
            <li key={index}>
              <span className="flex items-baseline justify-between gap-3">
                <span>{item.topic}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {t.duration(item.minutes)}
                </span>
              </span>
              {item.questions && item.questions.length > 0 && (
                <ul className="mt-1 grid list-disc gap-0.5 pl-5 text-xs text-muted-foreground">
                  {item.questions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const total = draft.reduce((sum, item) => sum + item.minutes, 0);

  const setItem = (index: number, patch: Partial<AgendaItem>) =>
    setDraft((items) =>
      items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  const removeItem = (index: number) =>
    setDraft((items) => items.filter((_, i) => i !== index));
  const addItem = () =>
    setDraft((items) => [...items, { topic: "", minutes: 10 }]);

  const save = async () => {
    setPending(true);
    const result = await updateCallAgenda(
      callId,
      draft.filter((item) => item.topic.trim() !== ""),
    );
    setPending(false);
    if (result.ok) setEditing(false);
    else toast.error(fr.calls.errors[result.error]);
  };

  return (
    <div className="grid gap-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium">{t.title}</h3>
        <p className="text-xs text-muted-foreground">{t.total(total)}</p>
      </div>

      <div className="grid gap-2">
        {draft.length === 0 && (
          <p className="text-sm text-muted-foreground">{t.empty}</p>
        )}
        {draft.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={item.topic}
              onChange={(e) => setItem(index, { topic: e.target.value })}
              placeholder={t.topicPlaceholder}
              maxLength={200}
              className="h-9 flex-1"
            />
            <Input
              type="number"
              min={1}
              max={240}
              value={item.minutes}
              onChange={(e) =>
                setItem(index, { minutes: Number(e.target.value) || 1 })
              }
              className="h-9 w-20 text-right"
            />
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={t.remove}
              onClick={() => removeItem(index)}
            >
              <IconTrash aria-hidden />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={addItem}>
          {t.add}
        </Button>
        <div className="flex-1" />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => setEditing(false)}
        >
          {t.cancel}
        </Button>
        <Button type="button" size="sm" disabled={pending} onClick={save}>
          {pending ? t.saving : t.save}
        </Button>
      </div>
    </div>
  );
}
