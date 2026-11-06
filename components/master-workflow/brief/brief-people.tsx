"use client";

import { useState } from "react";

import { FactRow, FactRows, type FactSource } from "@/components/ui/fact-row";
import { PickList } from "@/components/ui/pick-list";
import { masterBrief } from "@/lib/i18n/fr/master-brief";
import type { BriefDesignation } from "@/lib/master-workflow/brief-rules";
import { saveBriefFact } from "@/lib/master-workflow/brief-fact-actions";
import { setMasterPerson } from "@/lib/master-workflow/people-actions";
import type {
  BriefPerson,
  MasterBrief,
  UsualRates,
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
  // Who changes the people: the owner, or the DG (corrections).
  peopleEditor: "owner" | "direction" | null;
  validatedRounds: { mix: boolean; mastering: boolean };
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
  // Each engineer's usual rates (Réseau), for those who see the budget.
  usualRates: Record<string, UsualRates>;
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
      : // Chosen here: the Brief does not cite itself (Ibé 02/11/2026,
        // « beaucoup de bruit pour rien »); « Modifié par » says who.
        null;
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
  const { brief, projectId, changedBy, peopleEditor, validatedRounds } = props;
  const direction = peopleEditor === "direction";
  // « Oui, il masterise aussi » hides the mastering engineer at once, back
  // if the saving fails (Ibé, 02/11/2026).
  const [sameShown, setSameShown] = useState<{
    base: boolean;
    value: boolean;
  } | null>(null);
  const same =
    sameShown && sameShown.base === brief.masteringSameEngineer
      ? sameShown.value
      : brief.masteringSameEngineer;
  const saveSame = async (value: boolean) => {
    setSameShown({ base: brief.masteringSameEngineer, value });
    const result = direction
      ? await setMasterPerson(projectId, "same", value ? "yes" : "no")
      : await saveBriefFact(projectId, { masteringSame: value });
    if (!result.ok) setSameShown(null);
    return result;
  };
  const chooseEngineer = (field: "mix" | "mastering", id: string) => {
    const person = id.startsWith("person:");
    if (direction)
      return setMasterPerson(projectId, field, person ? id : `contact:${id}`);
    const personId = id.slice("person:".length);
    return saveBriefFact(
      projectId,
      field === "mix"
        ? person
          ? { mixPersonId: personId }
          : { mixContactId: id }
        : person
          ? { masteringPersonId: personId }
          : { masteringContactId: id },
    );
  };
  const chooseValidator = (id: string) =>
    direction
      ? setMasterPerson(projectId, "validator", id)
      : saveBriefFact(projectId, { validatorPersonId: id });
  const pick = (field: "mix" | "mastering", selected: string | null) =>
    peopleEditor && !validatedRounds[field]
      ? {
          list: (
            <EngineerPickList
              engineers={props.engineers}
              others={props.others}
              members={props.members}
              selectedId={selected}
              canAddContact={props.canAddContact}
              onChoose={(id) => chooseEngineer(field, id)}
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
        openOnRow
        label={t.fields.mix}
        value={mix?.name ?? null}
        missingAs="badge"
        missing={!mix}
        source={mix ? sourceOf(props.designations.mix) : t.sources.nobody}
        changedBy={changedBy.mix_contact_id}
        change={pick(
          "mix",
          brief.mixContactId ??
            (brief.mixPersonId ? `person:${brief.mixPersonId}` : null),
        )}
      />
      <FactRow
        openOnRow
        label={t.fields.same}
        value={same ? t.fields.yes : t.fields.no}
        changedBy={changedBy.mastering_same_engineer}
        edit={
          peopleEditor && !validatedRounds.mastering
            ? {
                kind: "select",
                value: same ? "yes" : "no",
                options: { yes: t.fields.yes, no: t.fields.no },
                done: t.changed,
                onSave: (value) => saveSame(value === "yes"),
              }
            : null
        }
      />
      {!same && (
        <FactRow
          openOnRow
          label={t.fields.mastering}
          value={mastering?.name ?? null}
          missingAs="badge"
          missing={!mastering}
          source={
            mastering
              ? sourceOf(props.designations.mastering)
              : t.sources.nobody
          }
          changedBy={changedBy.mastering_contact_id}
          change={pick(
            "mastering",
            brief.masteringContactId ??
              (brief.masteringPersonId
                ? `person:${brief.masteringPersonId}`
                : null),
          )}
        />
      )}
      <FactRow
        openOnRow
        label={t.fields.validator}
        value={validator?.name ?? null}
        missingAs="badge"
        missing={!validator}
        source={sourceOf(props.designations.validator, true)}
        changedBy={changedBy.validator_person_id}
        change={
          peopleEditor
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
                    onChoose={chooseValidator}
                  />
                ),
              }
            : null
        }
      />
    </FactRows>
  );
}
