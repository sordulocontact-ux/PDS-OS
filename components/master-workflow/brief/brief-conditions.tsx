"use client";

import { FactRow, FactRows, type FactSource } from "@/components/ui/fact-row";
import { PickList } from "@/components/ui/pick-list";
import { masterBrief } from "@/lib/i18n/fr/master-brief";
import type { BriefDesignation } from "@/lib/master-workflow/brief-rules";
import { saveBriefFact } from "@/lib/master-workflow/brief-fact-actions";
import type {
  BriefPerson,
  MasterBrief,
} from "@/lib/master-workflow/brief-types";
import type {
  NetworkEngineer,
  NetworkOther,
} from "@/lib/master-workflow/types";
import type { UsualRevisions } from "@/lib/master-workflow/usual-revisions";
import { parseEurosToCents } from "@/lib/projects/schemas";
import { amountInput, formatAmount } from "@/lib/utils/money";

import { EngineerPickList } from "./engineer-pick-list";

const fr = { masterBrief };

const t = fr.masterBrief;

export type BriefFactsProps = {
  projectId: string;
  canEdit: boolean;
  canSeeBudget: boolean;
  brief: MasterBrief;
  engineers: NetworkEngineer[];
  others: NetworkOther[];
  members: BriefPerson[];
  canAddContact: boolean;
  validators: BriefPerson[];
  designations: {
    mix: BriefDesignation | null;
    mastering: BriefDesignation | null;
    validator: BriefDesignation | null;
  };
  changedBy: Partial<Record<string, string>>;
  usualRevisions: UsualRevisions | null;
};

/** Where a designation comes from, as the row says it (rule 22). */
function sourceOf(
  d: BriefDesignation | null,
  female = false,
): FactSource | null {
  if (!d) return t.sources.nobody;
  const from = female ? t.sources.framingFemale : t.sources.framing;
  if (d.kind === "framing")
    return d.quote
      ? { quote: d.quote, from: d.label ? `${from} · ${d.label}` : from }
      : from;
  return d.kind === "credited"
    ? t.sources.credited
    : d.kind === "owner"
      ? t.sources.owner
      : t.sources.chosen;
}

/**
 * « Conditions de prestation » (proto): the engineers, chosen from the
 * Réseau with « Changer » (`EngineerPickList`, or added to it there),
 * whether the mix engineer masters too, the revisions, who validates the versions, and the internal rates (the owner
 * and the direction only). Each change is saved at once.
 */
export function BriefConditions(props: BriefFactsProps) {
  const { brief, canEdit, projectId, changedBy } = props;
  const usual = props.usualRevisions;
  const save = (patch: Parameters<typeof saveBriefFact>[1]) =>
    saveBriefFact(projectId, patch);
  // A contact of the Réseau, or a member of PDS (in-house engineer).
  const engineer = (id: string | null, personId: string | null = null) =>
    props.engineers.find((e) => e.id === id) ??
    props.others.find((o) => o.id === id) ??
    (personId
      ? { name: props.members.find((m) => m.personId === personId)?.name ?? "" }
      : null);
  const pick = (
    field: "mixContactId" | "masteringContactId",
    selected: string | null,
  ) =>
    canEdit
      ? {
          list: (
            <EngineerPickList
              engineers={props.engineers}
              others={props.others}
              members={props.members}
              selectedId={selected}
              canAddContact={props.canAddContact}
              onChoose={(id) =>
                save(
                  id.startsWith("person:")
                    ? {
                        [field === "mixContactId"
                          ? "mixPersonId"
                          : "masteringPersonId"]: id.slice("person:".length),
                      }
                    : { [field]: id },
                )
              }
            />
          ),
        }
      : null;
  const mix = engineer(brief.mixContactId, brief.mixPersonId);
  const mastering = engineer(brief.masteringContactId, brief.masteringPersonId);
  const validator = props.validators.find(
    (v) => v.personId === brief.validatorPersonId,
  );
  const rateEdit = (field: "mixRateCents" | "masteringRateCents") =>
    canEdit
      ? {
          kind: "text" as const,
          value: brief[field] === null ? "" : amountInput(brief[field]!),
          optional: true,
          done: t.changed,
          onSave: async (value: string) => {
            const cents = parseEurosToCents(value);
            if (cents === undefined)
              return { ok: false as const, error: t.errors.amount };
            return save({ [field]: cents });
          },
        }
      : null;
  const rateValue = (cents: number | null) =>
    cents === null ? null : formatAmount(cents);
  return (
    <FactRows>
      <FactRow
        label={t.fields.mix}
        value={mix?.name ?? null}
        missing={!mix}
        source={mix ? sourceOf(props.designations.mix) : t.sources.nobody}
        changedBy={changedBy.mix_contact_id}
        change={pick(
          "mixContactId",
          brief.mixContactId ??
            (brief.mixPersonId ? `person:${brief.mixPersonId}` : null),
        )}
      />
      <FactRow
        label={t.fields.same}
        value={brief.masteringSameEngineer ? t.fields.yes : t.fields.no}
        changedBy={changedBy.mastering_same_engineer}
        edit={
          canEdit
            ? {
                kind: "select",
                value: brief.masteringSameEngineer ? "yes" : "no",
                options: { yes: t.fields.yes, no: t.fields.no },
                done: t.changed,
                onSave: (value) => save({ masteringSame: value === "yes" }),
              }
            : null
        }
      />
      {!brief.masteringSameEngineer && (
        <FactRow
          label={t.fields.mastering}
          value={mastering?.name ?? null}
          missing={!mastering}
          source={
            mastering
              ? sourceOf(props.designations.mastering)
              : t.sources.nobody
          }
          changedBy={changedBy.mastering_contact_id}
          change={pick(
            "masteringContactId",
            brief.masteringContactId ??
              (brief.masteringPersonId
                ? `person:${brief.masteringPersonId}`
                : null),
          )}
        />
      )}
      <FactRow
        label={t.fields.revisions}
        value={brief.revisions === null ? null : t.revisions(brief.revisions)}
        source={
          brief.revisions === null
            ? null
            : usual && brief.revisions === usual.value
              ? t.sources.usualRevisions(usual.project)
              : t.sources.typed
        }
        changedBy={changedBy.revisions}
        edit={
          canEdit
            ? {
                kind: "number",
                value:
                  brief.revisions !== null
                    ? String(brief.revisions)
                    : usual
                      ? String(usual.value)
                      : "",
                proposal:
                  brief.revisions === null && usual
                    ? `${t.revisions(usual.value)} · ${t.sources.usualRevisions(usual.project)}`
                    : undefined,
                optional: true,
                done: t.changed,
                onSave: async (value) => {
                  const n = value === "" ? null : Number(value);
                  if (n !== null && !(Number.isInteger(n) && n >= 0 && n <= 20))
                    return { ok: false, error: t.errors.revisions };
                  return save({ revisions: n });
                },
              }
            : null
        }
      />
      <FactRow
        label={t.fields.validator}
        value={validator?.name ?? null}
        missing={!validator}
        source={sourceOf(props.designations.validator, true)}
        changedBy={changedBy.validator_person_id}
        change={
          canEdit
            ? {
                list: (
                  <PickList
                    groups={[
                      {
                        label: t.picker.team,
                        options: props.validators.map((v) => ({
                          id: v.personId,
                          label: v.name,
                          avatar: { pictureUrl: null },
                        })),
                      },
                    ]}
                    selectedId={brief.validatorPersonId}
                    done={t.changed}
                    onChoose={(id) => save({ validatorPersonId: id })}
                  />
                ),
              }
            : null
        }
      />
      {props.canSeeBudget && (
        <>
          <FactRow
            label={mix ? `${t.fields.mixRate} · ${mix.name}` : t.fields.mixRate}
            value={rateValue(brief.mixRateCents)}
            source={t.sources.rate}
            state={
              brief.mixRateCents === null
                ? null
                : { tone: "neutral", label: t.sources.estimated }
            }
            changedBy={changedBy.mix_rate_cents}
            edit={rateEdit("mixRateCents")}
          />
          <FactRow
            label={t.fields.masteringRate}
            value={rateValue(brief.masteringRateCents)}
            source={t.sources.rate}
            state={
              brief.masteringRateCents === null
                ? null
                : { tone: "neutral", label: t.sources.estimated }
            }
            changedBy={changedBy.mastering_rate_cents}
            edit={rateEdit("masteringRateCents")}
          />
        </>
      )}
    </FactRows>
  );
}
