"use client";

import { IconXmark } from "nucleo-sharp-essential";
import { useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/framing/option-select";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { answerItems } from "@/lib/framing/actions/answers";
import type { QuestionState } from "@/lib/framing/assess";
import {
  ITEM_STATES,
  type AnswerItem,
  type ItemState,
} from "@/lib/framing/dimensions";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";

const fr = { framingIntel };

export type StructuredAnswerProps = {
  projectId: string;
  question: QuestionState;
  // A sentence to start from: a proposal, or the suggestion picked.
  draft: string | null;
  // Structuring a stored proposal keeps its source.
  keepSource: boolean;
  presets?: string[];
  onCancel?: () => void;
  onDone: () => void;
};

export function StructuredActions({
  pending,
  onCancel,
}: {
  pending: boolean;
  onCancel?: () => void;
}) {
  const t = fr.framingIntel.guide;
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="submit" size="lg" disabled={pending}>
        {t.save}
      </Button>
      {onCancel && (
        <Button
          type="button"
          size="lg"
          variant="ghost"
          disabled={pending}
          onClick={onCancel}
        >
          {t.cancel}
        </Button>
      )}
    </div>
  );
}

/**
 * Several items, each with its state (PROJ-UX-05): « le mix » never stands
 * alone, it is « en cours » or « terminé ». Suggestions add an item in one
 * click, several can be picked; the same item is kept once.
 */
export function ItemsAnswer({
  projectId,
  question,
  draft,
  keepSource,
  presets = [],
  onCancel,
  onDone,
}: StructuredAnswerProps) {
  const t = fr.framingIntel.items;
  const states = fr.framingIntel.itemStates;
  const { pending, run } = useFramingAction();
  const [items, setItems] = useState<AnswerItem[]>(() => {
    const a = question.answer;
    if (a?.kind === "text" && a.items) return a.items;
    const start = draft ?? (a?.kind === "text" ? a.text : null);
    return start ? [{ label: start, state: "in_progress" }] : [];
  });
  const [tried, setTried] = useState(false);
  const has = (label: string) =>
    items.some((i) => i.label.toLowerCase() === label.toLowerCase());
  const set = (index: number, patch: Partial<AnswerItem>) =>
    setItems((all) =>
      all.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  const errors = {
    list: items.length === 0 ? t.required : undefined,
    labels: items.some((i) => !i.label.trim()) ? t.labelRequired : undefined,
  };

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (errors.list || errors.labels) return;
        run(
          () => answerItems(projectId, question.key, items, keepSource),
          onDone,
        );
      }}
    >
      {presets.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-caption text-muted-foreground">{t.presets}</p>
          <div className="flex flex-wrap gap-2">
            {presets.map((label) => (
              <FilterChip
                key={label}
                variant="soft"
                pressed={has(label)}
                onClick={() =>
                  setItems((all) =>
                    has(label)
                      ? all.filter(
                          (i) => i.label.toLowerCase() !== label.toLowerCase(),
                        )
                      : [...all, { label, state: "in_progress" }],
                  )
                }
              >
                {label}
              </FilterChip>
            ))}
          </div>
        </div>
      )}
      {items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {items.map((item, index) => (
            <li
              key={index}
              className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end"
            >
              <div className="grid gap-1.5">
                <Label htmlFor={`item-${index}`} required>
                  {t.itemLabel}
                </Label>
                <Input
                  id={`item-${index}`}
                  value={item.label}
                  maxLength={200}
                  aria-invalid={tried && !item.label.trim() ? true : undefined}
                  onChange={(e) => set(index, { label: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`item-state-${index}`} required>
                  {t.stateLabel}
                </Label>
                <OptionSelect
                  id={`item-state-${index}`}
                  label={t.stateLabel}
                  options={states}
                  value={item.state}
                  onChange={(v) => set(index, { state: v as ItemState })}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t.remove}
                onClick={() =>
                  setItems((all) => all.filter((_, i) => i !== index))
                }
              >
                <IconXmark aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={() =>
          setItems((all) => [...all, { label: "", state: ITEM_STATES[0] }])
        }
      >
        {t.add}
      </Button>
      <FieldError id={`${question.key}-items-error`}>
        {tried ? (errors.list ?? errors.labels) : undefined}
      </FieldError>
      <StructuredActions pending={pending} onCancel={onCancel} />
    </form>
  );
}
