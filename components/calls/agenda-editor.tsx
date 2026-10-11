"use client";

import {
  IconChevronDown,
  IconChevronUp,
  IconTrash,
} from "nucleo-sharp-essential";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AgendaItem } from "@/lib/calls/first-call-agenda";
import { fr } from "@/lib/i18n/fr";

const move = <T,>(list: T[], from: number, to: number): T[] => {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
};

/**
 * An agenda, edited point by point (PROJ-UX-03): each point's title and
 * duration, its questions written, added, removed, put in order, the points
 * themselves in order. The total is always the sum of the points, shown as
 * it changes. Used before the call is created and after.
 */
export function AgendaEditor({
  value,
  onChange,
  idPrefix,
}: {
  value: AgendaItem[];
  onChange: (value: AgendaItem[]) => void;
  idPrefix: string;
}) {
  const t = fr.calls.agenda;
  const total = value.reduce((sum, item) => sum + (item.minutes || 0), 0);
  const setItem = (index: number, patch: Partial<AgendaItem>) =>
    onChange(
      value.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  const setQuestions = (index: number, questions: string[]) =>
    setItem(index, { questions });

  return (
    <div className="flex flex-col gap-3">
      <p
        className="text-xs text-muted-foreground tabular-nums"
        aria-live="polite"
      >
        {t.total(total)}
      </p>
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      )}
      <ol className="flex flex-col gap-3">
        {value.map((item, index) => {
          const questions = item.questions ?? [];
          return (
            <li
              key={index}
              className="flex flex-col gap-2 rounded-lg border border-border p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  aria-label={t.topicLabel(index + 1)}
                  value={item.topic}
                  onChange={(e) => setItem(index, { topic: e.target.value })}
                  placeholder={t.topicPlaceholder}
                  maxLength={200}
                  className="h-9 min-w-0 flex-1 basis-48"
                />
                <Input
                  id={`${idPrefix}-minutes-${index}`}
                  aria-label={t.minutesLabel(index + 1)}
                  type="number"
                  min={1}
                  max={240}
                  value={item.minutes}
                  onChange={(e) =>
                    setItem(index, {
                      minutes: Math.max(
                        1,
                        Math.min(240, Number(e.target.value) || 1),
                      ),
                    })
                  }
                  className="h-9 w-20 text-right tabular-nums"
                />
                <span className="text-xs text-muted-foreground">{t.min}</span>
                <span className="flex">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={t.moveUp(index + 1)}
                    disabled={index === 0}
                    onClick={() => onChange(move(value, index, index - 1))}
                  >
                    <IconChevronUp aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={t.moveDown(index + 1)}
                    disabled={index === value.length - 1}
                    onClick={() => onChange(move(value, index, index + 1))}
                  >
                    <IconChevronDown aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={t.remove}
                    onClick={() =>
                      onChange(value.filter((_, i) => i !== index))
                    }
                  >
                    <IconTrash aria-hidden />
                  </Button>
                </span>
              </div>

              {questions.length > 0 && (
                <ul className="flex flex-col gap-1.5 pl-3">
                  {questions.map((question, q) => (
                    <li key={q} className="flex items-center gap-1">
                      <Input
                        aria-label={t.questionLabel(q + 1)}
                        value={question}
                        maxLength={300}
                        onChange={(e) =>
                          setQuestions(
                            index,
                            questions.map((x, i) =>
                              i === q ? e.target.value : x,
                            ),
                          )
                        }
                        className="h-8 min-w-0 flex-1 text-sm"
                      />
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t.questionUp(q + 1)}
                        disabled={q === 0}
                        onClick={() =>
                          setQuestions(index, move(questions, q, q - 1))
                        }
                      >
                        <IconChevronUp aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t.questionDown(q + 1)}
                        disabled={q === questions.length - 1}
                        onClick={() =>
                          setQuestions(index, move(questions, q, q + 1))
                        }
                      >
                        <IconChevronDown aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t.questionRemove(q + 1)}
                        onClick={() =>
                          setQuestions(
                            index,
                            questions.filter((_, i) => i !== q),
                          )
                        }
                      >
                        <IconTrash aria-hidden />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="self-start"
                onClick={() => setQuestions(index, [...questions, ""])}
              >
                {t.addQuestion}
              </Button>
            </li>
          );
        })}
      </ol>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="self-start"
        onClick={() => onChange([...value, { topic: "", minutes: 10 }])}
      >
        {t.add}
      </Button>
    </div>
  );
}

/** What is saved: no empty point, no empty question. */
export const cleanAgenda = (agenda: AgendaItem[]): AgendaItem[] =>
  agenda
    .filter((item) => item.topic.trim() !== "")
    .map((item) => {
      const questions = (item.questions ?? [])
        .map((q) => q.trim())
        .filter(Boolean);
      return {
        ...item,
        topic: item.topic.trim(),
        ...(questions.length ? { questions } : { questions: undefined }),
      };
    });
