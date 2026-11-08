"use client";

import { useRef, useState } from "react";

import { FieldError, FormMessage } from "@/components/auth/form-message";

import { OptionSelect } from "@/components/framing/option-select";
import { labelClass } from "@/components/ui/option-class";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { strategy } from "@/lib/i18n/fr/strategy";
import { strategyDeliverables } from "@/lib/i18n/fr/strategy-deliverables";
import type { DeliverableInput } from "@/lib/strategy/actions/deliverables";

const fr = { strategy, strategyDeliverables };

// Select values cannot be empty: "none" stands for "no assignee".
const NONE = "none";

/**
 * A committed deliverable, as the person names it: what, how many, for which
 * selected lever, by whom and for when. Used to add one and to edit one in
 * place; the caller remounts it (key) to empty it once saved.
 */
export function DeliverableForm({
  idPrefix,
  initial,
  levers,
  people,
  pending,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  idPrefix: string;
  initial?: DeliverableInput;
  // Selected levers: { id: label }.
  levers: Record<string, string>;
  // Members who can be named: { personId: name }.
  people: Record<string, string>;
  pending: boolean;
  submitLabel: string;
  onSubmit: (input: DeliverableInput) => void;
  onCancel?: () => void;
}) {
  const t = fr.strategy.deliverables;
  const d = fr.strategyDeliverables;
  const leverIds = Object.keys(levers);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [quantity, setQuantity] = useState(initial?.quantity ?? "");
  const [format, setFormat] = useState(initial?.format ?? "");
  const [lever, setLever] = useState(initial?.leverId ?? "");
  const [assignee, setAssignee] = useState(initial?.assigneePersonId || NONE);
  const [due, setDue] = useState(initial?.dueDate ?? "");
  // Said at the first try, never before (CLAUDE.md « Formulaires »).
  const [missing, setMissing] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  // Falls back to the first selected lever until one is picked.
  const leverId = leverIds.includes(lever) ? lever : (leverIds[0] ?? "");
  const id = (field: string) => `${idPrefix}-${field}`;

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (title.trim() === "") {
          setMissing(true);
          titleRef.current?.focus();
          return;
        }
        setMissing(false);
        onSubmit({
          leverId,
          title,
          quantity,
          format,
          assigneePersonId: assignee === NONE ? "" : assignee,
          dueDate: due,
        });
      }}
    >
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor={id("title")} required className={labelClass}>
          {t.name}
        </Label>
        <Input
          ref={titleRef}
          id={id("title")}
          aria-required
          aria-invalid={missing && title.trim() === "" ? true : undefined}
          aria-describedby={missing ? id("title-error") : undefined}
          maxLength={200}
          value={title}
          placeholder={d.titlePlaceholder}
          onChange={(e) => setTitle(e.target.value)}
        />
        <FieldError id={id("title-error")}>
          {missing && title.trim() === "" ? d.titleRequired : undefined}
        </FieldError>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <Label htmlFor={id("lever")} required className={labelClass}>
          {t.lever}
        </Label>
        <OptionSelect
          id={id("lever")}
          required
          label={t.lever}
          options={levers}
          fill
          value={leverId}
          onChange={setLever}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <Label htmlFor={id("quantity")} className={labelClass}>
          {d.quantity}
        </Label>
        <Input
          id={id("quantity")}
          placeholder="1"
          inputMode="numeric"
          maxLength={2}
          value={quantity}
          aria-describedby={id("quantity-hint")}
          onChange={(e) => setQuantity(e.target.value)}
          className="tabular-nums"
        />
        <p
          id={id("quantity-hint")}
          className="text-caption text-pretty text-muted-foreground"
        >
          {d.quantityHint}
        </p>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <Label htmlFor={id("format")} className={labelClass}>
          {d.format}
        </Label>
        <Input
          id={id("format")}
          maxLength={80}
          value={format}
          aria-describedby={id("format-hint")}
          onChange={(e) => setFormat(e.target.value)}
        />
        <p
          id={id("format-hint")}
          className="text-caption text-pretty text-muted-foreground"
        >
          {d.formatHint}
        </p>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <Label htmlFor={id("assignee")} className={labelClass}>
          {t.assignee}
        </Label>
        <OptionSelect
          id={id("assignee")}
          label={t.assignee}
          options={{ [NONE]: t.noAssignee, ...people }}
          fill
          value={assignee}
          onChange={setAssignee}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <Label htmlFor={id("due")} className={labelClass}>
          {t.dueDate}
        </Label>
        <Input
          id={id("due")}
          type="date"
          className="w-full"
          value={due}
          onChange={(e) => setDue(e.target.value)}
        />
      </div>
      {missing && title.trim() === "" && (
        <FormMessage kind="error" className="sm:col-span-2">
          {d.missingOne}
        </FormMessage>
      )}
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button
          type="submit"
          variant={initial ? "default" : "outline"}
          disabled={pending || !leverId}
        >
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {d.cancel}
          </Button>
        )}
      </div>
    </form>
  );
}
