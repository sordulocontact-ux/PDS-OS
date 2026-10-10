"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { TextareaField } from "@/components/auth/textarea-field";
import { useDesignAction } from "@/components/design/work/use-design-action";
import { Button } from "@/components/ui/button";
import type { DesignResult } from "@/lib/design/actions/shared";
import type { SheetItemInput } from "@/lib/design/actions/sheet-items";
import { fr } from "@/lib/i18n/fr";

/** One item of a series (title, objective, delivery, notes), in a modal. */
export function SheetItemForm({
  initial,
  save,
  success,
  onDone,
}: {
  initial: SheetItemInput;
  save: (input: SheetItemInput) => Promise<DesignResult>;
  success: string;
  onDone: () => void;
}) {
  const t = fr.conceptionSheet.items;
  const [values, setValues] = useState(initial);
  const { pending, run } = useDesignAction();
  const set = (key: keyof SheetItemInput, value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => save(values), { success, onSuccess: onDone });
      }}
    >
      <Field
        name="title"
        label={t.title}
        required
        maxLength={200}
        value={values.title}
        onChange={(e) => set("title", e.target.value)}
      />
      <TextareaField
        name="objective"
        label={t.objective}
        rows={3}
        maxLength={2000}
        value={values.objective}
        onChange={(e) => set("objective", e.target.value)}
      />
      <Field
        name="deliveryDate"
        type="date"
        label={t.deliveryDate}
        value={values.deliveryDate}
        onChange={(e) => set("deliveryDate", e.target.value)}
      />
      <TextareaField
        name="notes"
        label={t.notes}
        rows={2}
        maxLength={2000}
        value={values.notes}
        onChange={(e) => set("notes", e.target.value)}
      />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onDone}>
          {t.cancel}
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={pending || !values.title.trim()}
        >
          {pending ? t.saving : t.save}
        </Button>
      </div>
    </form>
  );
}
