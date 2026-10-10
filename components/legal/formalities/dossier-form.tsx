"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
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
import { useDossierErrors } from "./use-dossier-errors";
import { useLegalAction } from "@/components/legal/use-legal-action";
import { cn } from "@/lib/utils";

type Entry = { value: unknown; typed: boolean };
// Short fields side by side from `sm`; the people, arrangement and contract
// blocks take the whole width.
const HALF: readonly string[] = ["text", "date", "dep_dr"];
// Publishers are edited with the creators (one Phono total); in a section,
// the required fields come first.
const sectionFields = (section: string) =>
  SACEM_725_FIELDS.filter(
    (field) => field.section === section && field.kind !== "publishers",
  ).sort((a, b) => Number(b.required) - Number(a.required));
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
  // « Dossier enregistré » only once the server said so.
  const [saved, setSaved] = useState(false);
  const { root, errors, markEdited, attempt } = useDossierErrors(
    f.missing,
    Object.fromEntries(Object.entries(entries).map(([k, e]) => [k, e.value])),
    pending,
  );
  const reopening = f.status === "action_required";
  const editable = (key: string) =>
    EDITABLE.includes(f.status) && (!reopening || f.reopened.includes(key));
  const set = (key: string, value: unknown) => {
    setEntries((all) => ({ ...all, [key]: { value, typed: true } }));
    markEdited(key);
  };
  const text = (key: string) =>
    typeof entries[key]?.value === "string"
      ? (entries[key].value as string)
      : "";
  const obj = <T,>(key: string, fallback: T) =>
    (entries[key]?.value as T | null) ?? fallback;

  // Only a field reopened by a correction is flagged: where a value comes
  // from is not shown (Sacha, 07/10/2026), what misses turns red.
  const toVerify = (key: string) =>
    f.values[key]?.status === "to_verify" && (
      <StatusBadge tone="warning" size="sm" className="self-start">
        {t.sources.toVerify}
      </StatusBadge>
    );

  return (
    <div ref={root} className="flex flex-col gap-8">
      {SECTIONS.map((section) => (
        <section
          key={section}
          className="grid gap-x-4 gap-y-5 border-t border-[color:var(--border-hairline)] pt-6 sm:grid-cols-2"
        >
          <h3 className="text-base font-medium sm:col-span-2">
            {t.sections[section]}
          </h3>
          {sectionFields(section).map((field) => {
            const label = t.fields[field.key];
            const disabled = !editable(field.key);
            return (
              <div
                key={field.key}
                className={cn(
                  "flex min-w-0 flex-col gap-1.5",
                  !HALF.includes(field.kind) && "sm:col-span-2",
                )}
              >
                {toVerify(field.key)}
                {(field.kind === "text" || field.kind === "date") && (
                  <Field
                    type={field.kind}
                    name={`${f.id}-${field.key}`}
                    label={label}
                    aria-required={field.required || undefined}
                    value={text(field.key)}
                    disabled={disabled}
                    maxLength={2000}
                    hint={t.notes[field.key]}
                    error={errors?.fields[field.key]}
                    onChange={(e) => set(field.key, e.target.value)}
                  />
                )}
                {field.kind === "creators" && (
                  <PeopleEditor
                    masterId={title.masterId}
                    errors={errors}
                    creators={obj<Creator[]>("creators", [])}
                    publishers={obj<Publisher[]>("publishers", [])}
                    disabled={disabled}
                    // Shares taken from the confirmed split, not typed yet.
                    fromSplit={
                      Boolean(title.prefill.phono_from_split) &&
                      !entries.creators?.typed
                    }
                    onCreators={(next) => set("creators", next)}
                    onPublishers={(next) => set("publishers", next)}
                  />
                )}
                {field.kind === "dep_dr" && (
                  <OptionSelect
                    name={`${f.id}-dep-dr`}
                    label={label}
                    required={field.required}
                    hint={t.notes.dep_dr}
                    error={errors?.fields.dep_dr}
                    items={t.depDrChoices}
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
                    // Required once a creator is an arranger (formality_missing).
                    required={obj<Creator[]>("creators", []).some(
                      (c) => c.quality === "arranger",
                    )}
                    disabled={disabled}
                    value={obj("arrangement", { scope: "", detail: "" })}
                    error={errors?.fields.arrangement}
                    onChange={(v) => set("arrangement", v)}
                  />
                )}
                {field.kind === "contract" && (
                  <ContractField
                    id={f.id}
                    // Without a copy, the rubric G is required as soon as
                    // there is a publisher (formality_missing).
                    required={obj<Publisher[]>("publishers", []).length > 0}
                    disabled={disabled}
                    error={errors?.fields.publishing_contract}
                    value={obj("publishing_contract", {
                      provided: false,
                      rubric_g: "",
                    })}
                    onChange={(v) => set("publishing_contract", v)}
                  />
                )}
              </div>
            );
          })}
        </section>
      ))}
      {EDITABLE.includes(f.status) && (
        <div className="flex flex-col items-end gap-3 border-t border-[color:var(--border-hairline)] pt-6">
          {errors && errors.count > 0 && !pending && (
            <FormMessage kind="error" className="self-stretch">
              {saved
                ? t.page.invalid(errors.count)
                : t.page.missingCount(errors.count)}
            </FormMessage>
          )}
          <Button
            size="lg"
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={() => {
              setSaved(false);
              attempt();
              run(
                () =>
                  saveFormalityValues(projectId, title.masterId, f.id, entries),
                () => setSaved(true),
              );
            }}
          >
            {pending
              ? t.page.validating
              : Object.keys(f.values).length > 0
                ? t.page.update
                : t.page.validate}
          </Button>
        </div>
      )}
    </div>
  );
}
