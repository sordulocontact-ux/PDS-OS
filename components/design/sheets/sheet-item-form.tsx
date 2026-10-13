"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { useDesignAction } from "@/components/design/work/use-design-action";
import { Button } from "@/components/ui/button";
import type { DesignResult } from "@/lib/design/actions/shared";
import type { SheetItemInput } from "@/lib/design/actions/sheet-items";
import { fr } from "@/lib/i18n/fr";

/**
 * One item of a series, in a modal: title, objective, delivery, notes, and
 * since MKT-C2-07 its own responsible, concept and reference — a content of
 * its own when the series is decomposed.
 */
export function SheetItemForm({
  initial,
  members,
  save,
  success,
  onDone,
}: {
  initial: SheetItemInput;
  // The members who may be responsible for one content.
  members: Array<{ personId: string; name: string }>;
  save: (input: SheetItemInput) => Promise<DesignResult>;
  success: string;
  onDone: () => void;
}) {
  const t = fr.conceptionSheet.items;
  const [values, setValues] = useState(initial);
  const { pending, run } = useDesignAction();
  const [badReference, setBadReference] = useState(false);
  const set = (key: keyof SheetItemInput, value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        const reference = (values.referenceUrl ?? "").trim();
        const bad = reference !== "" && !/^https:\/\/\S+$/.test(reference);
        setBadReference(bad);
        if (bad) return;
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
        name="concept"
        label={t.concept}
        rows={3}
        maxLength={2000}
        value={values.concept ?? ""}
        onChange={(e) => set("concept", e.target.value)}
      />
      <OptionSelect
        name="responsiblePersonId"
        label={t.responsible}
        placeholder={t.noResponsible}
        items={Object.fromEntries(members.map((m) => [m.personId, m.name]))}
        defaultValue={values.responsiblePersonId || null}
        onValueChange={(value) => set("responsiblePersonId", value)}
      />
      <Field
        name="referenceUrl"
        type="url"
        inputMode="url"
        label={t.reference}
        maxLength={2000}
        value={values.referenceUrl ?? ""}
        error={badReference ? t.referenceInvalid : undefined}
        onChange={(e) => set("referenceUrl", e.target.value)}
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
