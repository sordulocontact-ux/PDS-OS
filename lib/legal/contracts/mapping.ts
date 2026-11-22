// The mapping of a project's agreements (ticket Juridique 03, « Personne →
// besoin → template proposé → document existant »), proposed by the code:
// a validated template whose roles meet the person's, the fee their fiche
// gave. Justine corrects and approves it at once. Pure.

import type { ContractState } from "@/lib/contracts/types";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import {
  FIELD_HOME,
  isContractField,
  type FieldSource,
} from "@/lib/legal/contracts/fields";
import {
  isBlocking,
  providerOf,
  valueStatus,
  type ValueProvider,
  type ValueStatus,
} from "@/lib/legal/contracts/completeness";
import {
  agreementStateOf,
  type AgreementState,
} from "@/lib/legal/contracts/state";
import type { ContractTemplate } from "@/lib/legal/contracts/templates";
import { fieldValues, type ValueContext } from "@/lib/legal/contracts/values";
import type { FormPerson } from "@/lib/legal/forms/people";
import type { FormRole } from "@/lib/legal/forms/definition";

const fr = { legalContracts };

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
  // JUR-16: its state, whether it blocks, who provides it.
  status: ValueStatus;
  required: boolean;
  provider: ValueProvider;
};

export type AgreementRow = {
  key: string;
  name: string;
  contactId: string | null;
  creditRoles: FormPerson["creditRoles"];
  formRoles: FormRole[];
  needId: string | null;
  contract: {
    id: string;
    state: ContractState;
    // JUR-11: back signed by the person's link, and signed for PDS.
    returned: boolean;
    countersigned: boolean;
  } | null;
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
  // « Pas d'accord nécessaire », with why (legal_no_agreement_reasons).
  noAgreementReason: string | null;
  // A collective's guest artist whose accord is not validated (§ 3.5 of
  // Ibé's 18/11/2026): the titles awaited. The contract is not drafted
  // before (lib/legal/title-contracts-rules.ts); set by loadAgreements.
  awaitingAgreement?: string[] | null;
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
    // JUR-11: back signed by the person's link, and signed for PDS.
    returned?: boolean;
    countersigned?: boolean;
  }>;
  contextOf: Map<string, Omit<ValueContext, "feeCents">>;
  ficheFeeOf: Map<string, number>;
  financialNeedOf: Map<string, number>;
  mappingApproved: boolean;
  // Contacts whose fiche is out, not back yet (JUR-16).
  ficheWaitingOf?: Set<string>;
  // Why no agreement is needed, by contact.
  noAgreementOf?: Map<string, string>;
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
    // Choosing the template chooses the contract's language (Ibé,
    // 18/11/2026): an English one says so, and French comes first, so the
    // template proposed stays a French one unless only English fits.
    const compatible = validated
      .filter((t) => overlap(t.roles, person.formRoles) > 0)
      .sort(
        (a, b) =>
          overlap(b.roles, person.formRoles) -
            overlap(a.roles, person.formRoles) ||
          Number(a.language === "en") - Number(b.language === "en"),
      )
      .map((t) => ({
        id: t.id,
        label: [
          `${t.name} · v${t.version}`,
          t.language === "en" ? fr.legalContracts.languages.en : null,
        ]
          .filter(Boolean)
          .join(" · "),
      }));
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
      ? fieldValues({
          ...ctx,
          feeCents: need?.feeCents ?? null,
          language: template?.language ?? "fr",
        })
      : null;
    const fields: AgreementField[] = (template?.fields ?? []).map((id) => {
      const found = values && isContractField(id) ? values[id] : null;
      const home = isContractField(id) ? FIELD_HOME[id] : "fiche";
      const status = valueStatus({
        id,
        value: found?.value ?? null,
        source: found?.source ?? null,
        notApplicable: found?.notApplicable === true,
        ficheWaiting: person.contactId
          ? (input.ficheWaitingOf?.has(person.contactId) ?? false)
          : false,
      });
      return {
        id,
        label: fr.legalContracts.fields[id] ?? id,
        value: found?.value ?? null,
        source: found?.source ?? null,
        home,
        status,
        // Every value its template writes is required, unless it does not
        // apply to this person.
        required: status !== "not_applicable",
        provider: providerOf(home),
      };
    });
    const ready =
      template?.status === "validated" &&
      fields.every((f) => !isBlocking(f.status));

    return {
      key: person.key,
      name: person.name,
      contactId: person.contactId,
      creditRoles: person.creditRoles,
      formRoles: person.formRoles,
      needId: need?.id ?? null,
      contract: generated
        ? {
            id: generated.id,
            state: generated.state,
            returned: generated.returned ?? false,
            countersigned: generated.countersigned ?? false,
          }
        : null,
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
      noAgreementReason:
        !need && person.contactId
          ? (input.noAgreementOf?.get(person.contactId) ?? null)
          : null,
    };
  });
}
