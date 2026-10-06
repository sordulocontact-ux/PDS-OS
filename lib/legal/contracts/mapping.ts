// The mapping of a project's agreements (ticket Juridique 03, « Personne →
// besoin → template proposé → document existant »), proposed by the code:
// a validated template whose roles meet the person's, the fee their fiche
// gave. Justine corrects and approves it at once. Pure.

import type { ContractState } from "@/lib/contracts/types";
import { fr } from "@/lib/i18n/fr";
import {
  FIELD_HOME,
  isContractField,
  type FieldSource,
} from "@/lib/legal/contracts/fields";
import {
  agreementStateOf,
  type AgreementState,
} from "@/lib/legal/contracts/state";
import type { ContractTemplate } from "@/lib/legal/contracts/templates";
import { fieldValues, type ValueContext } from "@/lib/legal/contracts/values";
import type { FormPerson } from "@/lib/legal/forms/people";
import type { FormRole } from "@/lib/legal/forms/definition";

export type StoredNeed = {
  id: string;
  contactId: string;
  roles: string[];
  templateId: string | null;
  feeCents: number | null;
  contractId: string | null;
};

export type AgreementField = {
  id: string;
  label: string;
  value: string | null;
  source: FieldSource | null;
  // Where it is kept: where a missing value is filled in.
  home: FieldSource;
};

export type AgreementRow = {
  key: string;
  name: string;
  contactId: string | null;
  creditRoles: FormPerson["creditRoles"];
  formRoles: FormRole[];
  needId: string | null;
  contract: { id: string; state: ContractState } | null;
  template: { id: string; name: string; version: number } | null;
  // Validated templates meant for these roles, best match first.
  compatible: Array<{ id: string; label: string }>;
  // What the mapping form starts from.
  proposal: {
    needed: boolean;
    templateId: string | null;
    feeCents: number | null;
    feeFromFiche: boolean;
  };
  // A contract with this person not generated from the mapping.
  existing: { id: string; title: string } | null;
  state: AgreementState;
  fields: AgreementField[];
  financialNeedCents: number | null;
};

export type MappingInput = {
  people: FormPerson[];
  needs: StoredNeed[];
  templates: ContractTemplate[];
  contracts: Array<{
    id: string;
    title: string;
    state: ContractState;
    partyIds: string[];
  }>;
  contextOf: Map<string, Omit<ValueContext, "feeCents">>;
  ficheFeeOf: Map<string, number>;
  financialNeedOf: Map<string, number>;
  mappingApproved: boolean;
};

const overlap = (a: readonly string[], b: readonly string[]) =>
  a.filter((x) => b.includes(x)).length;

export function agreementRows(input: MappingInput): AgreementRow[] {
  const templateById = new Map(input.templates.map((t) => [t.id, t]));
  const validated = input.templates.filter((t) => t.status === "validated");

  return input.people.map((person): AgreementRow => {
    const need = person.contactId
      ? (input.needs.find((n) => n.contactId === person.contactId) ?? null)
      : null;
    const generated = need?.contractId
      ? (input.contracts.find((c) => c.id === need.contractId) ?? null)
      : null;
    const existing = person.contactId
      ? (input.contracts.find(
          (c) =>
            c.id !== need?.contractId && c.partyIds.includes(person.contactId!),
        ) ?? null)
      : null;
    const compatible = validated
      .filter((t) => overlap(t.roles, person.formRoles) > 0)
      .sort(
        (a, b) =>
          overlap(b.roles, person.formRoles) -
          overlap(a.roles, person.formRoles),
      )
      .map((t) => ({ id: t.id, label: `${t.name} · v${t.version}` }));
    const ficheFee = person.contactId
      ? (input.ficheFeeOf.get(person.contactId) ?? null)
      : null;

    const template = need?.templateId
      ? (templateById.get(need.templateId) ?? null)
      : null;
    const ctx = person.contactId
      ? input.contextOf.get(person.contactId)
      : undefined;
    const values = ctx
      ? fieldValues({ ...ctx, feeCents: need?.feeCents ?? null })
      : null;
    const fields: AgreementField[] = (template?.fields ?? []).map((id) => {
      const found = values && isContractField(id) ? values[id] : null;
      return {
        id,
        label: fr.legalContracts.fields[id] ?? id,
        value: found?.value ?? null,
        source: found?.source ?? null,
        home: isContractField(id) ? FIELD_HOME[id] : "fiche",
      };
    });
    const ready =
      template?.status === "validated" && fields.every((f) => f.value !== null);

    return {
      key: person.key,
      name: person.name,
      contactId: person.contactId,
      creditRoles: person.creditRoles,
      formRoles: person.formRoles,
      needId: need?.id ?? null,
      contract: generated ? { id: generated.id, state: generated.state } : null,
      template: template
        ? { id: template.id, name: template.name, version: template.version }
        : null,
      compatible,
      proposal: need
        ? {
            needed: true,
            templateId: need.templateId,
            feeCents: need.feeCents,
            feeFromFiche: false,
          }
        : {
            needed: person.contactId !== null && existing === null,
            templateId: compatible[0]?.id ?? null,
            feeCents: ficheFee,
            feeFromFiche: ficheFee !== null,
          },
      existing: existing ? { id: existing.id, title: existing.title } : null,
      state: agreementStateOf({
        mapped: need !== null,
        mappingApproved: input.mappingApproved,
        contract: generated?.state ?? null,
        ready,
      }),
      fields,
      financialNeedCents: need?.contractId
        ? (input.financialNeedOf.get(need.contractId) ?? null)
        : null,
    };
  });
}
