"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { ChipChoice } from "@/components/ui/chip-choice";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  BLOCKER_CATEGORIES,
  SEVERITIES,
  type BlockerCategory,
  type Severity,
} from "@/lib/activations/model";
import { addBlocker } from "@/lib/activations/pilot-actions";
import type { Member } from "@/lib/framing/related";
import { activations } from "@/lib/i18n/fr/activations";

import { MemberSelect, memberValue } from "../member-select";

const fr = { activations };

const t = fr.activations.blockers;

/** « Signaler un blocage » : category, description, what blocks, its owner,
 * severity, impact and the expected resolution date. */
export function BlockerForm({
  projectId,
  activationId,
  members,
  onDone,
}: {
  projectId: string;
  activationId: string;
  members: Member[];
  onDone: () => void;
}) {
  const [severity, setSeverity] = useState<Severity>("medium");
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(onDone, t.added);

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const description = String(data.get("description") ?? "").trim();
    setMissing(!description);
    if (!description) return;
    run(() =>
      addBlocker({
        projectId,
        activationId,
        category: String(data.get("category")) as BlockerCategory,
        description,
        blockingObject: String(data.get("object") ?? ""),
        ownerPersonId: memberValue(data, "owner"),
        severity,
        impact: String(data.get("impact") ?? ""),
        expectedResolution: String(data.get("expected") ?? ""),
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
      <OptionSelect
        name="category"
        label={t.category}
        required
        items={Object.fromEntries(
          BLOCKER_CATEGORIES.map((c) => [c, t.categories[c]]),
        )}
        defaultValue="internal"
      />
      <TextareaField
        name="description"
        label={t.descriptionField}
        required
        rows={2}
        maxLength={1000}
        error={missing ? fr.activations.errors.reasonRequired : undefined}
      />
      <Field
        name="object"
        label={t.object}
        placeholder={t.objectPlaceholder}
        maxLength={200}
      />
      <MemberSelect
        name="owner"
        label={t.owner}
        members={members}
        noneLabel={fr.activations.noOwner}
        defaultValue={null}
      />
      <ChipChoice
        name="severity"
        legend={t.severity}
        value={severity}
        onChange={(v) => setSeverity(v ?? "medium")}
        options={SEVERITIES.map((s) => ({ value: s, label: t.severities[s] }))}
      />
      <TextareaField name="impact" label={t.impact} rows={2} maxLength={1000} />
      <Field name="expected" type="date" label={t.expected} />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {fr.activations.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? fr.activations.saving : t.add}
        </Button>
      </div>
    </form>
  );
}
