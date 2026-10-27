"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { PersonPickerField } from "@/components/network/person-picker-field";
import { usePickerLoad } from "@/components/network/use-picker-load";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { stepTools } from "@/lib/i18n/fr/step-tools";
import {
  loadUnblockerOptions,
  reportStepBlocker,
  type UnblockerOption,
} from "@/lib/step-tools/actions";
import type { StepRef } from "@/lib/step-tools/model";

import { ToolCard } from "./tool-card";

const fr = { stepTools };

const t = fr.stepTools;

type Missing = { what?: boolean; who?: boolean; next?: boolean };

/** What PO or a draft already knows, to correct rather than retype. */
export type BlockerDefaults = {
  description?: string;
  nextAction?: string;
  unblockerName?: string;
};

/**
 * « Signaler un blocage », opened in place in the step (proto blockerForm):
 * what blocks, who unblocks (a member, a contact of the Réseau or a name
 * only), the next action. Every field is required.
 */
export function BlockerForm({
  stepRef,
  defaults,
  onDone,
}: {
  stepRef: StepRef;
  defaults?: BlockerDefaults;
  onDone: () => void;
}) {
  const [missing, setMissing] = useState<Missing>({});
  const { pending, error, run } = useWriteSubmit(onDone, t.blocker.done);
  const load = usePickerLoad<UnblockerOption>(() =>
    loadUnblockerOptions(stepRef.projectId),
  );

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const text = (key: string) => String(data.get(key) ?? "").trim();
    const next: Missing = {
      what: !text("description"),
      who: !text("unblockerRef") && !text("unblockerName"),
      next: !text("nextAction"),
    };
    setMissing(next);
    if (next.what || next.who || next.next) {
      const first = next.what
        ? "description"
        : next.who
          ? "unblockerName"
          : "nextAction";
      form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    run(() =>
      reportStepBlocker({
        ...stepRef,
        description: text("description"),
        unblockerRef: text("unblockerRef"),
        unblockerName: text("unblockerName"),
        nextAction: text("nextAction"),
      }),
    );
  }

  const count = Object.values(missing).filter(Boolean).length;
  return (
    <ToolCard title={t.blocker.title}>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit(event.currentTarget);
        }}
      >
        <TextareaField
          name="description"
          label={t.blocker.what}
          required
          rows={2}
          maxLength={1000}
          placeholder={t.blocker.whatPlaceholder}
          defaultValue={defaults?.description}
          error={missing.what ? t.blocker.missingWhat : undefined}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <PersonPickerField<UnblockerOption>
            refName="unblockerRef"
            nameName="unblockerName"
            legend={t.blocker.who}
            required
            load={load}
            defaultRef={null}
            defaultName={defaults?.unblockerName ?? null}
            createRoles={["other"]}
            refOfContact={(id) => `c:${id}`}
            suggest={(o) => o.project}
            error={missing.who ? t.blocker.missingWho : undefined}
          />
          <Field
            name="nextAction"
            label={t.blocker.next}
            required
            maxLength={500}
            autoComplete="off"
            placeholder={t.blocker.nextPlaceholder}
            defaultValue={defaults?.nextAction}
            error={missing.next ? t.blocker.missingNext : undefined}
          />
        </div>
        {count > 0 && (
          <FormMessage kind="error">{t.missingCount(count)}</FormMessage>
        )}
        {error && <FormMessage kind="error">{error}</FormMessage>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {t.blocker.submit}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>
            {t.cancel}
          </Button>
        </div>
      </form>
    </ToolCard>
  );
}
