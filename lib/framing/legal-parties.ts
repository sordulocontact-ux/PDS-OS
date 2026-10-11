// The legal parties of the Cadrage (dimension 06), qualified one by one
// (PROJ-BUG-03). Client-safe.
//
// Who may be a party is read by code from the project's records: the
// titles' credits, the team held by a contact or a name (never a member of
// the app), the intervenants the Juridique added. What each one needs is a
// person's decision: the ticket gives the statuses (existant, à vérifier, à
// préparer, non nécessaire, non applicable) but no rule « this role needs
// this document », and the law in the repository does not either, so no
// status is ever deduced from a role (docs/CONTEXTE-PROJET.md § 2). Code
// only points at a proof: a contract of Contrats the contact is party to.
// An operational contributor (mixing, mastering) is listed like anyone else,
// never as a contractual party by default; a role nobody holds is no party.

import type { FramingKnowledge, PartyContract } from "@/lib/framing/knowledge";
import { rolesContext } from "@/lib/framing/assess";
import { teamBoard } from "@/lib/framing/team-board";
import { fr } from "@/lib/i18n/fr";
import { normalizeSearch } from "@/lib/utils/search";

export const DOCUMENT_STATUSES = [
  "existing",
  "to_verify",
  "to_prepare",
  "not_needed",
  "not_applicable",
] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];
export const PARTY_RELATIONS = [
  "client",
  "provider",
  "partner",
  "supplier",
  "other",
] as const;
export type PartyRelation = (typeof PARTY_RELATIONS)[number];
// Said with a reason (« Non applicable » exige une justification, PROJ-UX-04).
export const REASONED_STATUSES: readonly DocumentStatus[] = [
  "not_needed",
  "not_applicable",
];

export type PartyDecision = FramingKnowledge["legalPartyDecisions"][number];

export type LegalPartyLine = {
  key: string;
  name: string;
  contactId: string | null;
  roles: string[];
  // Where the party was found (credits, team, Juridique).
  origins: string[];
  decision: PartyDecision | null;
  // Contracts of Contrats this contact is party to.
  contracts: PartyContract[];
  // Pointed at by code, never applied: a signed contract → « Existant »,
  // another contract → « À vérifier ».
  suggestion: {
    status: "existing" | "to_verify";
    contract: PartyContract;
  } | null;
};

export type LegalPartyBoard = {
  lines: LegalPartyLine[];
  undecided: number;
  // Roles the Cadrage needs that nobody holds: no party yet.
  unassignedRoles: string[];
};

export const partyKeyOf = (name: string) => normalizeSearch(name.trim());

export function legalPartyBoard(k: FramingKnowledge): LegalPartyBoard {
  const r = fr.framingIntel.records;
  const s = fr.framingIntel.sources;
  const lower = (label: string) => label.toLowerCase();
  const creditRole = (role: string) =>
    role === "performer"
      ? r.performer
      : role === "featuring"
        ? r.featuring
        : lower(
            (fr.masterPage.credits.roles as Record<string, string>)[role] ??
              role,
          );
  const teamRoles = fr.framingGuide.team.roles as Record<string, string>;

  const parties = new Map<
    string,
    {
      name: string;
      contactId: string | null;
      roles: Set<string>;
      origins: Set<string>;
    }
  >();
  const add = (
    name: string,
    role: string | null,
    contactId: string | null,
    origin: string,
  ) => {
    const key = partyKeyOf(name);
    if (!key) return;
    const party = parties.get(key) ?? {
      name: name.trim(),
      contactId: null,
      roles: new Set<string>(),
      origins: new Set<string>(),
    };
    party.contactId ??= contactId;
    if (role?.trim()) party.roles.add(role.trim());
    party.origins.add(origin);
    parties.set(key, party);
  };
  for (const c of k.credits)
    add(c.name, creditRole(c.role), c.contactId, s.credits);
  for (const m of k.framing.team) {
    if (m.person_id || m.review_status !== "confirmed") continue;
    const role = m.role_key ? teamRoles[m.role_key] : m.role;
    add(m.display_name, role ? lower(role) : null, m.contact_id, s.team);
  }
  for (const c of k.legalContacts)
    add(
      c.name,
      lower((fr.legalForms.roles as Record<string, string>)[c.role] ?? c.role),
      c.contactId,
      s.legal,
    );

  const lines = [...parties.entries()].map(([key, p]): LegalPartyLine => {
    const contracts = p.contactId
      ? k.partyContracts.filter((c) => c.contactId === p.contactId)
      : [];
    const signed = contracts.find((c) => c.status === "signed");
    const other = contracts.find(
      (c) => c.status !== "signed" && c.status !== "terminated",
    );
    return {
      key,
      name: p.name,
      contactId: p.contactId,
      roles: [...p.roles],
      origins: [...p.origins],
      decision: k.legalPartyDecisions.find((d) => d.party_key === key) ?? null,
      contracts,
      suggestion: signed
        ? { status: "existing", contract: signed }
        : other
          ? { status: "to_verify", contract: other }
          : null,
    };
  });

  const { roles } = teamBoard(k.framing.team, k.framing.needs, rolesContext(k));
  return {
    lines,
    undecided: lines.filter((l) => !l.decision).length,
    unassignedRoles: roles
      .filter((card) => !card.member && !card.holder)
      .map((card) => teamRoles[card.role] ?? card.role),
  };
}

/** What a person decided for a party, in words (without its name). */
export function partyDecisionText(
  line: LegalPartyLine,
  ownerName: (personId: string) => string | null,
): string {
  const t = fr.framingIntel.parties;
  const d = line.decision;
  if (!d) return t.undecided;
  const contract = line.contracts.find((c) => c.id === d.contract_id);
  const owner = d.owner_person_id ? ownerName(d.owner_person_id) : null;
  return [
    d.relation ? t.relations[d.relation as PartyRelation] : null,
    t.statuses[d.document_status as DocumentStatus],
    contract ? t.contract(contract.title) : null,
    owner ? t.owner(owner) : null,
    d.note,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** One party in words, for the Brief and its PDF. */
export function partyLineText(
  line: LegalPartyLine,
  ownerName: (personId: string) => string | null,
): string {
  const head = line.roles.length
    ? `${line.name} (${line.roles.join(", ")})`
    : line.name;
  return `${head} · ${partyDecisionText(line, ownerName)}`;
}
