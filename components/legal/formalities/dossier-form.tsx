"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import { saveFormalityValues } from "@/lib/legal/formalities/actions";
import {
  SACEM_725_FIELDS,
  type Creator,
  type Publisher,
} from "@/lib/legal/formalities/definition";
import type { TitleFormality } from "@/lib/legal/formalities/types";

import { ArrangementField, ContractField } from "./dossier-fields";
import { PeopleEditor } from "./people-editor";
import { useLegalAction } from "@/components/legal/use-legal-action";

type Entry = { value: unknown; typed: boolean };
const SECTIONS = ["work", "exploitation", "people", "agreements"] as const;
const EDITABLE = [
  "collecting_data",
  "ready_to_generate",
  "document_ready",
  "signatures_pending",
  "ready_to_submit",
  "action_required",
];

/**
 * « Il préremplit les champs sourcés et liste les valeurs manquantes ou à
 * vérifier » then « Justine valide » in one grouped control: each field with
 * where its value comes from; a value typed is kept as typed.
 */
export function DossierForm({
  projectId,
  title,
}: {
  projectId: string;
  title: TitleFormality;
}) {
  const t = fr.legalFormalities;
  const f = title.formality!;
  const [entries, setEntries] = useState<Record<string, Entry>>(() =>
    Object.fromEntries(
      SACEM_725_FIELDS.map((field) => {
        const stored = f.values[field.key];
        const sourced = title.prefill[field.key];
        if (stored)
          return [
            field.key,
            { value: stored.value, typed: stored.source === "Saisi" },
          ];
        if (sourced) return [field.key, { value: sourced.value, typed: false }];
        return [field.key, { value: null, typed: true }];
      }),
    ),
  );
  const { pending, run } = useLegalAction();
  const reopening = f.status === "action_required";
  const editable = (key: string) =>
    EDITABLE.includes(f.status) && (!reopening || f.reopened.includes(key));
  const set = (key: string, value: unknown) =>
    setEntries((all) => ({ ...all, [key]: { value, typed: true } }));
  const text = (key: string) =>
    typeof entries[key]?.value === "string"
      ? (entries[key].value as string)
      : "";
  const obj = <T,>(key: string, fallback: T) =>
    (entries[key]?.value as T | null) ?? fallback;

  const provenance = (key: string) => {
    const stored = f.values[key];
    if (stored?.status === "to_verify")
      return (
        <StatusBadge tone="warning" size="sm">
          {t.sources.toVerify}
        </StatusBadge>
      );
    const entry = entries[key];
    const source = !entry?.typed
      ? (stored?.source ?? title.prefill[key]?.source)
      : null;
    if (source)
      return (
        <StatusBadge
          tone="success"
          size="sm"
        >{`${t.sources.sourced} · ${source}`}</StatusBadge>
      );
    if (entry?.value)
      return (
        <StatusBadge tone="info" size="sm">
          {t.sources.typed}
        </StatusBadge>
      );
    return (
      <StatusBadge tone="neutral" size="sm">
        {t.sources.missing}
      </StatusBadge>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {SECTIONS.map((section) => (
        <section key={section} className="flex flex-col gap-3">
          <h3 className="font-medium">{t.sections[section]}</h3>
          {SACEM_725_FIELDS.filter(
            // Publishers are edited with the creators (one Phono total).
            (field) => field.section === section && field.kind !== "publishers",
          ).map((field) => {
            const label = `${t.fields[field.key]}${field.required ? " *" : ""}`;
            const disabled = !editable(field.key);
            return (
              <div key={field.key} className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  {provenance(field.key)}
                </div>
                {field.kind === "text" && (
                  <Field
                    name={`${f.id}-${field.key}`}
                    label={label}
                    value={text(field.key)}
                    disabled={disabled}
                    maxLength={2000}
                    onChange={(e) => set(field.key, e.target.value)}
                  />
                )}
                {field.kind === "creators" && (
                  <>
                    <span className="font-medium">{label}</span>
                    <PeopleEditor
                      creators={obj<Creator[]>("creators", [])}
                      publishers={obj<Publisher[]>("publishers", [])}
                      disabled={disabled}
                      onCreators={(next) => set("creators", next)}
                      onPublishers={(next) => set("publishers", next)}
                    />
                  </>
                )}
                {field.kind === "dep_dr" && (
                  <OptionSelect
                    name={`${f.id}-dep-dr`}
                    label={label}
                    items={{ DEP: "DEP", DR: "DR" }}
                    defaultValue={
                      obj<{ choice: string }>("dep_dr", { choice: "" })
                        .choice || null
                    }
                    onValueChange={(v) => set("dep_dr", { choice: v })}
                  />
                )}
                {field.kind === "arrangement" && (
                  <ArrangementField
                    id={f.id}
                    label={label}
                    disabled={disabled}
                    value={obj("arrangement", { scope: "", detail: "" })}
                    onChange={(v) => set("arrangement", v)}
                  />
                )}
                {field.kind === "contract" && (
                  <ContractField
                    id={f.id}
                    disabled={disabled}
                    value={obj("publishing_contract", {
                      provided: false,
                      rubric_g: "",
                    })}
                    onChange={(v) => set("publishing_contract", v)}
                  />
                )}
                {t.notes[field.key] && field.kind !== "creators" && (
                  <p className="text-sm text-muted-foreground">
                    {t.notes[field.key]}
                  </p>
                )}
              </div>
            );
          })}
        </section>
      ))}
      {EDITABLE.includes(f.status) && (
        <Button
          size="lg"
          className="self-end"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={() =>
            run(() =>
              saveFormalityValues(projectId, title.masterId, f.id, entries),
            )
          }
        >
          {pending ? t.page.validating : t.page.validate}
        </Button>
      )}
    </div>
  );
}
