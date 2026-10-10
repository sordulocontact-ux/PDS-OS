"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { DialogFormActions } from "@/components/production/prep/need-dialog-actions";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import {
  POST_STEP_KEYS,
  POST_STEP_STATUSES,
  postStepKeyOf,
  postStepStatusOf,
  type PostStepKey,
} from "@/lib/production/post/rules";
import { savePostStep } from "@/lib/production/post/step-actions";
import type { PostScope, PostStep } from "@/lib/production/post/types";
import type { NetworkOption } from "@/lib/production/sheet";

import {
  HolderSelect,
  holderValue,
} from "@/components/production/holder-select";
import { usePostSubmit } from "./use-post-submit";

const t = fr.productionPost.steps;

/**
 * A step of the postproduction: which step, who does it (nobody until the
 * owner confirms), the responsibilities, dates, access and progress. `step`
 * to modify one; `initialKey` for a suggestion of PO.
 */
export function StepForm({
  scope,
  step,
  initialKey,
  members,
  contacts,
  onDone,
}: {
  scope: PostScope;
  step: PostStep | null;
  initialKey: PostStepKey;
  members: Member[];
  contacts: NetworkOption[];
  onDone: () => void;
}) {
  const [key, setKey] = useState<PostStepKey>(step?.key ?? initialKey);
  const [holder, setHolder] = useState(holderValue(step?.holder ?? null));
  const [missing, setMissing] = useState<"label" | "dates" | null>(null);
  const { pending, error, run } = usePostSubmit(onDone, t.done);

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const text = (name: string) => String(data.get(name) ?? "");
    const startsOn = text("startsOn");
    const endsOn = text("endsOn");
    const lack =
      key === "other" && text("label").trim() === ""
        ? "label"
        : startsOn && endsOn && endsOn < startsOn
          ? "dates"
          : null;
    setMissing(lack);
    if (lack) {
      form.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }
    run(() =>
      savePostStep({
        projectId: scope.projectId,
        sheetId: scope.sheetId,
        stepId: step?.id,
        key,
        label: text("label"),
        holder,
        responsibilities: text("responsibilities"),
        accessNote: text("accessNote"),
        startsOn,
        endsOn,
        status: postStepStatusOf(data.get("status")) ?? "todo",
      }),
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit(event.currentTarget);
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="post-step-key" required>
          {t.key}
        </Label>
        <Select
          items={t.keys}
          value={key}
          onValueChange={(next) => {
            const parsed = postStepKeyOf(next);
            if (parsed) setKey(parsed);
          }}
        >
          <SelectTrigger
            id="post-step-key"
            className="w-full text-base data-[size=default]:h-10 md:text-sm"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {POST_STEP_KEYS.map((k) => (
              <SelectItem key={k} value={k}>
                {t.keys[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {key === "other" && (
        <Field
          name="label"
          label={t.label}
          aria-required
          maxLength={120}
          defaultValue={step?.label ?? ""}
          error={missing === "label" ? t.missing.label : undefined}
        />
      )}
      <HolderSelect
        id="post-step-holder"
        label={t.holder}
        noneLabel={t.holderNone}
        value={holder}
        current={step?.holder ?? null}
        members={members}
        contacts={contacts}
        onChange={setHolder}
      />
      <TextareaField
        name="responsibilities"
        label={t.responsibilities}
        rows={3}
        maxLength={2000}
        defaultValue={step?.responsibilities ?? ""}
      />
      <Field
        name="accessNote"
        label={t.access}
        maxLength={1000}
        placeholder={t.accessPlaceholder}
        defaultValue={step?.accessNote ?? ""}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="startsOn"
          type="date"
          label={t.startsOn}
          defaultValue={step?.startsOn ?? ""}
        />
        <Field
          name="endsOn"
          type="date"
          label={t.endsOn}
          defaultValue={step?.endsOn ?? ""}
          error={missing === "dates" ? t.missing.dates : undefined}
        />
      </div>
      <ChoiceCards
        name="status"
        legend={t.status}
        columns={3}
        defaultValue={step?.status ?? POST_STEP_STATUSES[0]}
        choices={POST_STEP_STATUSES.map((s) => ({
          value: s,
          label: t.statuses[s],
        }))}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <DialogFormActions
        pending={pending}
        submitLabel={fr.productionPost.save}
        onCancel={onDone}
      />
    </form>
  );
}
