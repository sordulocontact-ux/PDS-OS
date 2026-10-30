import type { UrlFilterGroup } from "@/components/ui/url-filters";
import {
  CONTRACT_TYPES,
  CONTRACT_VIEW_KEYS,
  inContractView,
  type ContractRow,
  type ContractView,
} from "@/lib/contracts/types";
import { contracts as contractsText } from "@/lib/i18n/fr/contracts";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import type {
  TemplateSeries,
  TemplateStatus,
} from "@/lib/legal/contracts/templates";
import { optionsOfNames } from "@/lib/ui/filter-options";

const fr = { contracts: contractsText, legalContracts };

// The filters of the Contrats page (Sacha, 30/10/2026): the contract's state
// first (?view=, the former tabs), then type, project; artist and owner
// behind the filter button. Only what some contract holds is offered.

export type ContractFilters = {
  view: ContractView | null;
  type: string | null;
  project: string | null;
  artist: string | null;
  owner: string | null;
};

export const matchesContract = (c: ContractRow, f: ContractFilters) =>
  (!f.view || inContractView(c.state, f.view)) &&
  (!f.type || c.type === f.type) &&
  (!f.project || c.projectTitle === f.project) &&
  (!f.artist || c.artistName === f.artist) &&
  (!f.owner || c.ownerName === f.owner);

export function contractFilterGroups(
  contracts: ContractRow[],
  current: ContractFilters,
): UrlFilterGroup[] {
  const t = fr.contracts;
  return [
    {
      key: "view",
      label: t.filters.stateLabel,
      allLabel: t.filters.stateAll,
      options: CONTRACT_VIEW_KEYS.filter((view) =>
        contracts.some((c) => inContractView(c.state, view)),
      ).map((view) => ({ value: view, label: t.views[view] })),
      current: current.view,
    },
    {
      key: "type",
      label: t.filters.typeLabel,
      allLabel: t.filters.typeAll,
      options: CONTRACT_TYPES.filter((type) =>
        contracts.some((c) => c.type === type),
      ).map((type) => ({ value: type, label: t.types[type] })),
      current: current.type,
    },
    {
      key: "project",
      label: t.filters.projectLabel,
      allLabel: t.filters.projectAll,
      options: optionsOfNames(contracts.map((c) => c.projectTitle)),
      current: current.project,
    },
    {
      key: "artist",
      label: t.filters.artistLabel,
      allLabel: t.filters.artistAll,
      options: optionsOfNames(contracts.map((c) => c.artistName)),
      current: current.artist,
    },
    {
      key: "owner",
      label: t.filters.ownerLabel,
      allLabel: t.filters.ownerAll,
      options: optionsOfNames(contracts.map((c) => c.ownerName)),
      current: current.owner,
    },
  ];
}

const TEMPLATE_STATES: TemplateStatus[] = ["draft", "validated", "retired"];

export type TemplateFilters = { state: string | null; type: string | null };

export const matchesTemplate = (t: TemplateSeries, f: TemplateFilters) =>
  (!f.state || t.status === f.state) && (!f.type || t.type === f.type);

export function templateFilterGroups(
  templates: TemplateSeries[],
  current: TemplateFilters,
): UrlFilterGroup[] {
  const t = fr.legalContracts.templates;
  return [
    {
      key: "tstate",
      label: t.filters.stateLabel,
      allLabel: t.filters.stateAll,
      options: TEMPLATE_STATES.filter((state) =>
        templates.some((x) => x.status === state),
      ).map((state) => ({ value: state, label: t.states[state] })),
      current: current.state,
    },
    {
      key: "ttype",
      label: t.filters.typeLabel,
      allLabel: t.filters.typeAll,
      options: CONTRACT_TYPES.filter((type) =>
        templates.some((x) => x.type === type),
      ).map((type) => ({ value: type, label: fr.contracts.types[type] })),
      current: current.type,
    },
  ];
}
