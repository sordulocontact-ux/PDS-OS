"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { TextareaField } from "@/components/auth/textarea-field";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { Checkbox } from "@/components/ui/checkbox";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { OptionSelect } from "@/components/framing/option-select";
import { CheckboxField } from "@/components/ui/checkbox-field";
import {
  INCIDENT_CATEGORIES,
  INCIDENT_IMPACTS,
  type IncidentCategory,
} from "@/lib/production/shoot/rules";
import { saveShootIncident } from "@/lib/production/shoot/incident-actions";
import type { ShootIncident } from "@/lib/production/shoot/rules";
import type { NetworkOption } from "@/lib/production/sheet";

import {
  HolderSelect,
  holderValue,
} from "@/components/production/holder-select";
import { ShootFormActions } from "./shoot-form-actions";

const t = fr.productionShoot.incidents;

/** What the form starts from: a saved incident, or a pre-filled title and
 * impact (a return incident reported as a shoot incident). */
export type IncidentDraft =
  | { incident: ShootIncident }
  | { incident: null; title: string; impact: string };

/** Adds or edits an incident: its impact, who follows it, the follow-up,
 * and what it blocks — only what the person ticks. */
export function IncidentForm({
  projectId,
  sheetId,
  draft,
  members,
  contacts,
  onDone,
}: {
  projectId: string;
  sheetId: string;
  draft: IncidentDraft;
  members: Member[];
  contacts: NetworkOption[];
  onDone: () => void;
}) {
  const incident = draft.incident;
  const [holder, setHolder] = useState(holderValue(incident?.holder ?? null));
  const [category, setCategory] = useState<IncidentCategory>(
    incident?.category ?? "other",
  );
  const [missingTitle, setMissingTitle] = useState(false);
  const { pending, error, run } = useWriteSubmit(
    onDone,
    incident ? t.saved : t.added,
  );
  const prefix = `incident-${incident?.id ?? "new"}`;

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    const title = text("title");
    setMissingTitle(title === "");
    if (title === "") {
      form.querySelector<HTMLElement>(`#${prefix}-title`)?.focus();
      return;
    }
    run(() =>
      saveShootIncident({
        projectId,
        sheetId,
        incidentId: incident?.id ?? null,
        title,
        impact: text("impact"),
        holder,
        followUp: text("followUp"),
        blocksClosing: data.has("blocksClosing"),
        blocksPost: data.has("blocksPost"),
        category,
        impacts: INCIDENT_IMPACTS.filter((i) => data.has(`impact-${i}`)),
      }),
    );
  }

  const blocks = [
    {
      name: "blocksClosing",
      label: t.fields.blocksClosing,
      hint: t.fields.blocksClosingHint,
      checked: incident?.blocksClosing ?? false,
    },
    {
      name: "blocksPost",
      label: t.fields.blocksPost,
      hint: t.fields.blocksPostHint,
      checked: incident?.blocksPost ?? false,
    },
  ];

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit(event.currentTarget);
      }}
    >
      <Field
        id={`${prefix}-title`}
        name="title"
        label={t.fields.title}
        aria-required
        autoComplete="off"
        maxLength={200}
        placeholder={t.fields.titlePlaceholder}
        defaultValue={incident ? incident.title : draft.title}
        error={missingTitle ? t.missingTitle : undefined}
      />
      <OptionSelect
        id={`${prefix}-category`}
        label={t.fields.category}
        options={Object.fromEntries(
          INCIDENT_CATEGORIES.map((c) => [c, t.categories[c]]),
        )}
        value={category}
        onChange={(v) => setCategory(v as IncidentCategory)}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">{t.fields.impacts}</legend>
        <p className="text-xs text-muted-foreground">{t.fields.impactsHint}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {INCIDENT_IMPACTS.map((i) => (
            <CheckboxField
              key={i}
              name={`impact-${i}`}
              label={t.impacts[i]}
              defaultChecked={incident?.impacts.includes(i) ?? false}
            />
          ))}
        </div>
      </fieldset>
      <TextareaField
        id={`${prefix}-impact`}
        name="impact"
        label={t.fields.impact}
        rows={3}
        maxLength={2000}
        placeholder={t.fields.impactPlaceholder}
        defaultValue={incident ? (incident.impact ?? "") : draft.impact}
      />
      <HolderSelect
        id={`${prefix}-holder`}
        label={t.fields.holder}
        noneLabel={t.fields.noHolder}
        current={incident?.holder ?? null}
        value={holder}
        onChange={setHolder}
        members={members}
        contacts={contacts}
      />
      <TextareaField
        id={`${prefix}-follow-up`}
        name="followUp"
        label={t.fields.followUp}
        rows={2}
        maxLength={2000}
        placeholder={t.fields.followUpPlaceholder}
        defaultValue={incident?.followUp ?? ""}
      />
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">{t.fields.blocks}</legend>
        {blocks.map((b) => (
          <label key={b.name} className="flex cursor-pointer items-start gap-3">
            <Checkbox
              name={b.name}
              size="md"
              defaultChecked={b.checked}
              className="mt-0.5"
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{b.label}</span>
              <span className="text-sm text-muted-foreground">{b.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <ShootFormActions
        pending={pending}
        error={error}
        submitLabel={incident ? fr.productionShoot.save : t.add}
        onCancel={onDone}
      />
    </form>
  );
}
