"use client";

import { Field } from "@/components/auth/field";
import { OptionSelect } from "@/components/projects/option-select";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import {
  SACEM_725_FIELDS,
  type Creator,
  type Publisher,
} from "@/lib/legal/formalities/definition";
import type { DossierErrors } from "@/lib/legal/formalities/field-errors";
import { CURRENT_SHARING_RULE } from "@/lib/legal/formalities/sharing-rule";
import type { TitleFormality } from "@/lib/legal/formalities/types";
import { cn } from "@/lib/utils";

import { DepDrPreview } from "./dep-dr-preview";
import { ArrangementField, ContractField } from "./dossier-fields";
import { PeopleEditor } from "./people-editor";

// Short fields side by side from `sm`; the people, arrangement and contract
// blocks take the whole width.
const HALF: readonly string[] = ["text", "date"];
// Publishers are edited with the creators (one Phono total); in a section,
// the required fields come first.
const sectionFields = (section: string) =>
  SACEM_725_FIELDS.filter(
    (field) => field.section === section && field.kind !== "publishers",
  ).sort((a, b) => Number(b.required) - Number(a.required));

/**
 * One section of the SACEM dossier (L'œuvre, Exploitation, Créateurs et
 * éditeur, Accords), every field in place on the step's single page (proto
 * « Projet complet »): a value typed is kept as typed.
 */
export function DossierSection({
  section,
  title,
  errors,
  editable,
  fromSplit,
  text,
  obj,
  set,
}: {
  section: string;
  title: TitleFormality;
  errors: DossierErrors | null;
  editable: (key: string) => boolean;
  fromSplit: boolean;
  text: (key: string) => string;
  obj: <T>(key: string, fallback: T) => T;
  set: (key: string, value: unknown) => void;
}) {
  const t = fr.legalFormalities;
  const f = title.formality!;
  // Only a field reopened by a correction is flagged « À vérifier ».
  const toVerify = (key: string) =>
    f.values[key]?.status === "to_verify" && (
      <StatusBadge tone="warning" size="sm" className="self-start">
        {t.sources.toVerify}
      </StatusBadge>
    );
  return (
    <section className="grid gap-x-4 gap-y-5 border-t border-[color:var(--border-hairline)] pt-6 sm:grid-cols-2">
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
                formalityId={f.id}
                errors={errors}
                creators={obj<Creator[]>("creators", [])}
                publishers={obj<Publisher[]>("publishers", [])}
                disabled={disabled}
                splitShares={title.splitShares}
                fromSplit={fromSplit}
                onCreators={(next) => set("creators", next)}
                onPublishers={(next) => {
                  set("publishers", next);
                  // « Copie jointe » only with every publisher's contract
                  // chosen (JUR-25).
                  set("publishing_contract", {
                    ...obj("publishing_contract", {
                      provided: false,
                      rubric_g: "",
                    }),
                    provided:
                      next.length > 0 && next.every((p) => p.contract_id),
                  });
                }}
              />
            )}
            {field.kind === "dep_dr" && (
              <>
                <OptionSelect
                  name={`${f.id}-dep-dr`}
                  label={label}
                  required={field.required}
                  hint={t.notes.dep_dr}
                  error={errors?.fields.dep_dr}
                  items={t.depDrChoices}
                  defaultValue={
                    obj<{ choice: string }>("dep_dr", { choice: "" }).choice ||
                    null
                  }
                  onValueChange={(v) =>
                    set("dep_dr", {
                      choice: v,
                      // The rule the preview used is kept with the dossier:
                      // a later rule never changes it (JUR-23).
                      rule:
                        obj<{ rule?: string }>("dep_dr", {}).rule ??
                        CURRENT_SHARING_RULE,
                    })
                  }
                />
                <DepDrPreview
                  creators={obj<Creator[]>("creators", [])}
                  publishers={obj<Publisher[]>("publishers", [])}
                  choice={
                    obj<{ choice: string }>("dep_dr", { choice: "" }).choice
                  }
                  ruleId={
                    obj<{ rule?: string }>("dep_dr", {}).rule ??
                    CURRENT_SHARING_RULE
                  }
                />
              </>
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
                // Without a copy, the rubric G is required as soon as there
                // is a publisher (formality_missing).
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
  );
}
