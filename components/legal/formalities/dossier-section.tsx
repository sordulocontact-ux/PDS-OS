"use client";

import { Field } from "@/components/auth/field";
import { OptionSelect } from "@/components/projects/option-select";
import { FactRows } from "@/components/ui/fact-row";
import { StepSection } from "@/components/shell/journey/step-section";
import { legalFormalities } from "@/lib/i18n/fr/legal-formalities";
import {
  SACEM_725_FIELDS,
  SACEM_GENRES,
  type Creator,
  type FormalitySection,
  type Publisher,
} from "@/lib/legal/formalities/definition";
import type { DossierErrors } from "@/lib/legal/formalities/field-errors";
import type { FieldStateEntry } from "@/lib/legal/formalities/field-states";
import type { TitleFormality } from "@/lib/legal/formalities/types";

import { BorrowingLine } from "./borrowing-line";
import { DepDrField, type DepDr } from "./dep-dr-field";
import { ArrangementField, ContractField } from "./dossier-fields";
import { BulletinRow } from "./field-state";
import { PeopleEditor } from "./people-editor";
import { PhonoTotal } from "./phono-total";

const fr = { legalFormalities };

/**
 * One numbered section of the SACEM bulletin (recette Juridique V1, JUR-02:
 * Œuvre, Créateurs, Éditeurs, Répartition, Exploitation), every field in
 * place, each saying where its value stands (« Confirmé », « Proposé » with
 * its source, « Manquant ») — no list of checks apart. A value typed is kept
 * as typed.
 */
export function DossierSection({
  projectId,
  section,
  title,
  errors,
  editable,
  fromSplit,
  stateOf,
  others,
  text,
  obj,
  set,
}: {
  projectId: string;
  section: FormalitySection;
  title: TitleFormality;
  errors: DossierErrors | null;
  editable: (key: string) => boolean;
  fromSplit: boolean;
  // A field's state; none: confirmed, or optional and empty.
  stateOf: (key: string) => FieldStateEntry | null;
  // What this section misses that no field answers.
  others: FieldStateEntry[];
  text: (key: string) => string;
  obj: <T>(key: string, fallback: T) => T;
  set: (key: string, value: unknown) => void;
}) {
  const t = fr.legalFormalities;
  const f = title.formality!;
  const creators = obj<Creator[]>("creators", []);
  const publishers = obj<Publisher[]>("publishers", []);
  const depDr = obj<DepDr>("dep_dr", {});

  // A field's state, on its row: none when optional and empty.
  const rowState = (key: string, filled: boolean) => {
    const s = stateOf(key);
    if (s?.state === "optional") return {};
    if (!s) return filled ? { state: "confirmed" as const } : {};
    return {
      state: s.state,
      reason: s.reason,
      onConfirm:
        s.confirmable && editable(key)
          ? () => set(key, obj(key, null))
          : undefined,
    };
  };

  return (
    <StepSection title={t.sections[section]}>
      {section === "sharing" && (
        <PhonoTotal
          id={`phono-${title.masterId}-error`}
          creators={creators}
          publishers={publishers}
          error={errors?.phono}
        />
      )}
      <FactRows>
        {SACEM_725_FIELDS.filter((field) => field.section === section).map(
          (field) => {
            const label = t.fields[field.key];
            const disabled = !editable(field.key);
            const value = text(field.key);
            const arrangerRequired = creators.some(
              (c) => c.quality === "arranger",
            );
            return (
              <BulletinRow
                key={field.key}
                label={label}
                required={
                  field.kind === "arrangement"
                    ? arrangerRequired
                    : field.kind === "contract"
                      ? publishers.length > 0
                      : field.kind === "genre" ||
                        field.kind === "dep_dr" ||
                        field.required
                }
                {...rowState(
                  field.key,
                  field.kind === "creators"
                    ? creators.length > 0
                    : field.kind === "publishers"
                      ? publishers.length > 0
                      : field.kind === "dep_dr"
                        ? Boolean(depDr.choice)
                        : value.trim() !== "",
                )}
                control={
                  <>
                    {(field.kind === "text" || field.kind === "date") && (
                      <Field
                        type={field.kind}
                        name={`${f.id}-${field.key}`}
                        label={label}
                        hideLabel
                        aria-required={field.required || undefined}
                        value={value}
                        disabled={disabled}
                        maxLength={2000}
                        hint={t.notes[field.key]}
                        error={errors?.fields[field.key]}
                        onChange={(e) => set(field.key, e.target.value)}
                      />
                    )}
                    {field.kind === "genre" && (
                      <OptionSelect
                        name={`${f.id}-genre`}
                        label={label}
                        required
                        placeholder={t.genrePlaceholder}
                        items={Object.fromEntries(
                          [
                            ...SACEM_GENRES,
                            // A genre typed before the list stays chosen.
                            ...(value && !SACEM_GENRES.some((g) => g === value)
                              ? [value]
                              : []),
                          ].map((g) => [g, g]),
                        )}
                        defaultValue={value || null}
                        error={errors?.fields.genre}
                        onValueChange={(v) => set("genre", v)}
                      />
                    )}
                    {(field.kind === "creators" ||
                      field.kind === "publishers") && (
                      <PeopleEditor
                        part={field.kind}
                        masterId={title.masterId}
                        formalityId={f.id}
                        errors={errors}
                        creators={creators}
                        publishers={publishers}
                        disabled={disabled}
                        splitShares={title.splitShares}
                        fromSplit={fromSplit}
                        onCreators={(next) => set("creators", next)}
                        onPublishers={(next) => {
                          set("publishers", next);
                          // « Copie jointe » only with every publisher's
                          // contract chosen (JUR-25).
                          set("publishing_contract", {
                            ...obj("publishing_contract", {
                              provided: false,
                              rubric_g: "",
                            }),
                            provided:
                              next.length > 0 &&
                              next.every((p) => p.contract_id),
                          });
                        }}
                      />
                    )}
                    {field.kind === "dep_dr" && (
                      <DepDrField
                        id={f.id}
                        label={label}
                        value={depDr}
                        creators={creators}
                        publishers={publishers}
                        errors={errors}
                        onChange={(v) => set("dep_dr", v)}
                      />
                    )}
                    {field.kind === "arrangement" && (
                      <ArrangementField
                        id={f.id}
                        label={label}
                        // Required once a creator is an arranger.
                        required={creators.some(
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
                        required={publishers.length > 0}
                        disabled={disabled}
                        error={errors?.fields.publishing_contract}
                        value={obj("publishing_contract", {
                          provided: false,
                          rubric_g: "",
                        })}
                        onChange={(v) => set("publishing_contract", v)}
                      />
                    )}
                  </>
                }
              />
            );
          },
        )}
        {section === "work" && (
          <BorrowingLine projectId={projectId} borrowings={title.borrowings} />
        )}
        {others.map((o) => (
          <BulletinRow key={o.key} state="missing" label={o.label} />
        ))}
      </FactRows>
    </StepSection>
  );
}
