"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { ChipChoice } from "@/components/ui/chip-choice";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { createActivation, updateActivation } from "@/lib/activations/actions";
import {
  ACTIVATION_KINDS,
  ACTIVATION_MODES,
  PRIORITIES,
  kindHasMode,
  type ActivationKind,
  type ActivationMode,
  type Priority,
} from "@/lib/activations/model";
import type { ActivationRecord } from "@/lib/activations/types";
import { routes } from "@/lib/auth/redirects";
import type { Member } from "@/lib/framing/related";
import { activations } from "@/lib/i18n/fr/activations";

import { MemberSelect, memberValue } from "./member-select";

const fr = { activations };

const t = fr.activations;

export type ActivationFormSource = {
  kind: "lever" | "deliverable" | "handoff";
  id: string;
  label: string;
  proposedKind: ActivationKind;
};

/**
 * Creates an activation (by hand or from a source, its title and kind
 * proposed from the source) or modifies one (`activation`). A created one
 * opens on its page. The mode only exists for Influence and RP. A new one is
 * proposed to the project's owner (`defaultOwnerId`), who may change it.
 */
export function ActivationForm({
  projectId,
  members,
  activation,
  source,
  defaultOwnerId = null,
  onDone,
}: {
  projectId: string;
  members: Member[];
  activation?: ActivationRecord;
  source?: ActivationFormSource;
  defaultOwnerId?: string | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<ActivationKind>(
    activation?.kind ?? source?.proposedKind ?? "content",
  );
  const [mode, setMode] = useState<ActivationMode | null>(
    activation?.mode ?? null,
  );
  const [priority, setPriority] = useState<Priority>(
    activation?.priority ?? "normal",
  );
  const [evidence, setEvidence] = useState(
    activation?.evidenceExpected ?? true,
  );
  const [metrics, setMetrics] = useState(activation?.metricsExpected ?? true);
  const [errors, setErrors] = useState<{ title?: string; mode?: string }>({});
  const { pending, error, run } = useWriteSubmit(
    onDone,
    activation ? t.identity.saved : t.create.created,
  );
  const withMode = kindHasMode(kind);

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    const next = {
      title: title ? undefined : t.errors.titleRequired,
      mode: withMode && !mode ? t.errors.modeRequired : undefined,
    };
    setErrors(next);
    if (next.title || next.mode) {
      form.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }
    const values = {
      projectId,
      title,
      objective: String(data.get("objective") ?? ""),
      ownerPersonId: memberValue(data, "owner"),
      priority,
      startsOn: String(data.get("startsOn") ?? ""),
      dueOn: String(data.get("dueOn") ?? ""),
      mode: withMode ? mode : null,
    };
    run(async () => {
      if (activation)
        return updateActivation({
          ...values,
          activationId: activation.id,
          description: String(data.get("description") ?? ""),
          evidenceExpected: evidence,
          metricsExpected: metrics,
        });
      const result = await createActivation({
        ...values,
        kind,
        source: source ? { kind: source.kind, id: source.id } : null,
      });
      if (result.ok)
        router.push(routes.projectActivation(projectId, result.id));
      return result;
    });
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
      {!activation && (
        <OptionSelect
          name="kind"
          label={t.create.kind}
          required
          items={Object.fromEntries(
            ACTIVATION_KINDS.map((k) => [k, t.kinds[k]]),
          )}
          defaultValue={kind}
          onValueChange={(v) => setKind(v as ActivationKind)}
        />
      )}
      {withMode && (
        <ChoiceCards
          name="mode"
          legend={t.create.mode}
          required
          value={mode}
          onChange={setMode}
          choices={ACTIVATION_MODES.map((m) => ({
            value: m,
            label: t.modes[m],
            hint: t.modeHints[m],
          }))}
        />
      )}
      {errors.mode && <FormMessage kind="error">{errors.mode}</FormMessage>}
      <Field
        name="title"
        label={t.create.titleField}
        required
        maxLength={200}
        placeholder={t.create.titlePlaceholder}
        defaultValue={activation?.title ?? source?.label ?? ""}
        error={errors.title}
      />
      <TextareaField
        name="objective"
        label={t.create.objective}
        maxLength={2000}
        rows={2}
        defaultValue={activation?.objective ?? ""}
      />
      {activation && (
        <TextareaField
          name="description"
          label={t.identity.description}
          maxLength={4000}
          rows={3}
          defaultValue={activation.description ?? ""}
        />
      )}
      <MemberSelect
        name="owner"
        label={t.create.owner}
        members={members}
        noneLabel={t.create.ownerNone}
        defaultValue={activation ? activation.ownerPersonId : defaultOwnerId}
      />
      <ChipChoice
        name="priority"
        legend={t.create.priority}
        value={priority}
        onChange={(v) => setPriority(v ?? "normal")}
        options={PRIORITIES.map((p) => ({ value: p, label: t.priorities[p] }))}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="startsOn"
          type="date"
          label={t.create.starts}
          defaultValue={activation?.startsOn ?? ""}
        />
        <Field
          name="dueOn"
          type="date"
          label={t.create.due}
          defaultValue={activation?.dueOn ?? ""}
        />
      </div>
      {activation && (
        <div className="flex flex-col gap-3">
          <CheckboxField
            label={t.identity.evidenceExpected}
            checked={evidence}
            onChange={setEvidence}
          />
          <CheckboxField
            label={t.identity.metricsExpected}
            checked={metrics}
            onChange={setMetrics}
          />
        </div>
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {t.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? t.saving : activation ? t.identity.edit : t.create.submit}
        </Button>
      </div>
    </form>
  );
}
