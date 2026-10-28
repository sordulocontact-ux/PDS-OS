"use client";

import { useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EXTRA_TOPIC_MINUTES } from "@/lib/calls/prepare";
import { callPrep } from "@/lib/i18n/fr/call-prep";

import { AgendaRow } from "./agenda-row";
import type { AgendaDraftItem } from "./use-agenda-draft";
import { useReorder } from "./use-reorder";

const fr = { callPrep };

/**
 * The agenda of a call, one editor everywhere: points in order (drag by the
 * handle, arrow keys on it, Monter / Descendre on touch screens), edited in
 * place, removed, added, each with its duration (PROJ-UX-03) and the total.
 * PO's questions are not edited here: they stay with their point and are
 * read in the planned exchange's card (Sacha 28/10/2026, « Préparer en
 * détail » removed).
 */
export function AgendaList({
  id,
  items,
  onChange,
  onAdd,
}: {
  id: string;
  items: AgendaDraftItem[];
  onChange: (items: AgendaDraftItem[]) => void;
  onAdd: (topic: string) => void;
}) {
  const t = fr.callPrep;
  const [draft, setDraft] = useState("");
  const [missing, setMissing] = useState(false);
  const [said, setSaid] = useState("");
  const move = (from: number, to: number) => {
    const next = [...items];
    next.splice(to, 0, next.splice(from, 1)[0]);
    onChange(next);
    setSaid(t.moved(next[to].topic, to + 1));
  };
  const { rowProps, gripProps, dragging, over, moveTo } = useReorder(
    items.length,
    move,
  );
  const patch = (index: number, change: Partial<AgendaDraftItem>) =>
    onChange(
      items.map((item, i) => (i === index ? { ...item, ...change } : item)),
    );
  const add = () => {
    const topic = draft.trim();
    if (!topic) return setMissing(true);
    onAdd(topic);
    setDraft("");
    setMissing(false);
  };
  const total = items.reduce(
    (sum, x) => sum + (x.minutes ?? EXTRA_TOPIC_MINUTES),
    0,
  );

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={`${id}-title`} className="text-body-md font-semibold">
          {t.agenda}
        </h3>
        {items.length > 0 && (
          <span className="text-caption text-[color:var(--text-tertiary)] tabular-nums">
            {t.total(total)}
          </span>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-caption text-[color:var(--text-tertiary)]">
          {t.agendaEmpty}
        </p>
      ) : (
        <ol className="flex flex-col rounded-xl border border-[var(--border-default)]">
          {items.map((item, index) => (
            <AgendaRow
              key={item.id}
              item={{ ...item, minutes: item.minutes ?? EXTRA_TOPIC_MINUTES }}
              index={index}
              count={items.length}
              rowProps={rowProps(index)}
              gripProps={gripProps(index)}
              dragging={dragging === index}
              overEdge={
                over?.index === index
                  ? over.before
                    ? "before"
                    : "after"
                  : null
              }
              onMove={(delta) => moveTo(index, index + delta)}
              onEdit={(topic) => patch(index, { topic })}
              onRemove={() => onChange(items.filter((_, i) => i !== index))}
              onMinutes={(minutes) => patch(index, { minutes })}
            />
          ))}
        </ol>
      )}
      <p aria-live="polite" className="sr-only">
        {said}
      </p>
      <div className="flex flex-wrap gap-2">
        <Input
          id={`${id}-add`}
          aria-label={t.addPoint}
          value={draft}
          maxLength={200}
          placeholder={t.addPoint}
          aria-invalid={missing || undefined}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className="h-10 min-w-0 flex-[1_1_13.75rem] text-body-md"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-center"
          onClick={add}
        >
          {t.add}
        </Button>
      </div>
      {missing && (
        <FieldError id={`${id}-add-error`}>{t.pointMissing}</FieldError>
      )}
    </section>
  );
}
