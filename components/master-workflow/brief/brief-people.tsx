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

/** A contact of the Réseau, or a member of PDS (in-house engineer). */
export function engineerOf(
  props: Pick<BriefFactsProps, "engineers" | "others" | "members">,
  id: string | null,
  personId: string | null = null,
) {
  return (
    props.engineers.find((e) => e.id === id) ??
    props.others.find((o) => o.id === id) ??
    (personId
      ? { name: props.members.find((m) => m.personId === personId)?.name ?? "" }
      : null)
  );
}

/**
 * « Qui fait quoi sur ce master » (Ibé, 02/11/2026: the people come first,
 * as soon as the Master opens): the engineers, chosen from the Réseau with
 * « Changer » (`EngineerPickList`, or added to it there), whether the mix
 * engineer masters too, and who validates the versions. Each change is
 * saved at once.
 */
export function BriefPeople(props: BriefFactsProps) {
  const { brief, canEdit, projectId, changedBy } = props;
  const save = (patch: Parameters<typeof saveBriefFact>[1]) =>
    saveBriefFact(projectId, patch);
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
  const mix = engineerOf(props, brief.mixContactId, brief.mixPersonId);
  const mastering = engineerOf(
    props,
    brief.masteringContactId,
    brief.masteringPersonId,
  );
  const validator = props.validators.find(
    (v) => v.personId === brief.validatorPersonId,
  );
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
    </FactRows>
  );
}
