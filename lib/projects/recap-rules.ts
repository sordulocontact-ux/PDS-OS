// The collective's recap (retours d'Ibé du 18/11/2026, lot 2): « Titres et
// artistes » read as the team's Excel. Computed from what the modules hold,
// never stored; read by loadTitleRecap (lib/projects/recap.ts). Pure,
// shared by the server and the client.
//
// Shape of the data (TitleRecap = the lot 6 board, plus `recap` keys):
//   TitleRecap
//   ├ titles: RecapTitle[]            BoardTitle + recap:
//   │   ├ recap.label                 « Titre de Jay (à nommer) » (guests)
//   │   ├ recap.releaseDecision       true / false / null (not decided)
//   │   ├ recap.beatmakers            RecapPerson[] ([] : no master, none)
//   │   └ participations: RecapParticipation[]   BoardParticipation + recap:
//   │       ├ contactState            to_contact / contacted / agreed / null
//   │       ├ note                    string | null
//   │       ├ contact                 RecapContact | null (none known)
//   │       ├ fiche                   RecapFiche | null (no manage_legal)
//   │       ├ contract                { state: RecapContract; href } | null
//   │       └ accord                  RecapAccord | null (dealReach none)
//   ├ dealReach                       as lot 6
//   ├ counts                          { to_contact, contacted, agreed }
//   ├ call                            SharedNegotiationCall | null (once)
//   ├ canReadLegal                    manage_legal: fiches and contracts
//   └ canEditNetwork                  manage_network: contact and phone
// A row's « Caler le call »: negotiationCallData(recap.call, accord.call)
// (lib/deals/negotiation-call-rules.ts), shown when accord.showPlanCall.

import { routes } from "@/lib/auth/redirects";
import type { ContractState } from "@/lib/contracts/types";
import type {
  NegotiationCallTarget,
  SharedNegotiationCall,
} from "@/lib/deals/negotiation-call-rules";
import { formatTermValue, parseTermValue } from "@/lib/deals/term-format";
import type { AgreementStatus, DealStage } from "@/lib/deals/types";
import {
  agreementStateOf,
  type AgreementState,
} from "@/lib/legal/contracts/state";
import { ficheNeeded } from "@/lib/legal/forms/completeness";
import type { FormState, FormSubmission } from "@/lib/legal/forms/queries";
import { ficheStatusOf, type FicheStatus } from "@/lib/legal/forms/state";
import {
  isActiveParticipation,
  type ParticipationStatus,
} from "@/lib/projects/participation-rules";
import type {
  BoardParticipation,
  BoardTitle,
  TitleBoard,
} from "@/lib/projects/title-board-rules";
import type { Tone } from "@/lib/ui/state-tones";
import { network } from "@/lib/i18n/fr/network";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import type { NetworkRole } from "@/lib/network/types";
import { normalizeSearch } from "@/lib/utils/search";

// ----------------------------------------------------------- Contact state

/** The participation's status in the Excel's words (décision du ticket :
 * the status relabelled, orange then green): proposed « À contacter »,
 * invited « Contacté », confirmed « D'accord ». */
export const CONTACT_STATES = ["to_contact", "contacted", "agreed"] as const;
export type ContactState = (typeof CONTACT_STATES)[number];

/** Null: declined or withdrawn, no longer in play. */
export function contactStateOf(
  status: ParticipationStatus,
): ContactState | null {
  switch (status) {
    case "proposed":
      return "to_contact";
    case "invited":
      return "contacted";
    case "confirmed":
      return "agreed";
    default:
      return null;
  }
}

/** How many participations in play are in each state, titles abandoned
 * left out: the recap's filtering pills. */
export function recapCounts(
  titles: ReadonlyArray<{
    status: string;
    participations: ReadonlyArray<{ status: ParticipationStatus }>;
  }>,
): Record<ContactState, number> {
  const counts: Record<ContactState, number> = {
    to_contact: 0,
    contacted: 0,
    agreed: 0,
  };
  for (const title of titles) {
    if (title.status === "abandoned") continue;
    for (const p of title.participations) {
      const state = contactStateOf(p.status);
      if (state) counts[state] += 1;
    }
  }
  return counts;
}

// ----------------------------------------------------------------- Contact

/** A contact of the Réseau as the reader may read it: a private contact's
 * coordinates he may not read are `hidden` (« coordonnées privées »),
 * never « no number ». */
export type ContactRow = {
  id: string;
  name: string;
  phone: string | null;
  hidden: boolean;
  // network_contacts.roles (a role is no private detail).
  roles: readonly NetworkRole[];
};

/** What the recap says a contact is for the artist (Ibé 21/11: « Thibaud
 * manager », « Producteur JL »): the most relevant of its roles, a manager,
 * then a producer, else the first; « other » says nothing. Null: none. */
export function contactRoleOf(
  roles: readonly NetworkRole[],
): NetworkRole | null {
  const known = roles.filter((role) => role !== "other");
  return (
    known.find((role) => role === "manager") ??
    known.find((role) => role === "producer") ??
    known[0] ??
    null
  );
}

/** The roles offered for a new contact: the two Ibé names, and the rest. */
export const NEW_CONTACT_ROLES = ["manager", "producer", "other"] as const;
export type NewContactRole = (typeof NEW_CONTACT_ROLES)[number];

/** A role in the recap's words: « Producteur » for `producer` (the Réseau
 * says « Réalisateur·rice »), « Manager » for `manager` (« Management »),
 * the Réseau's words for the others. */
export function contactRoleLabel(role: NetworkRole): string {
  const own = projectTitles.recap.contact.roles;
  return role in own ? own[role as keyof typeof own] : network.roles[role];
}

/**
 * Who to call for the artist (the Excel's « Contact »: the manager's
 * number): the participation's interlocutor (title_participations.
 * contact_id), else the artist's main manager at the Catalogue
 * (artist_contacts, read with manage_catalog). `contactId` null only for a
 * Catalogue manager not linked to the Réseau (its own name and number, its
 * link the artist's page); otherwise its link is the contact's page, where
 * changing the number changes it in the Réseau.
 */
export type RecapContact = {
  contactId: string | null;
  name: string;
  phone: string | null;
  hidden: boolean;
  // What it is for the artist; null: no role known (« Contact »).
  role: NetworkRole | null;
  source: "participation" | "catalog";
  href: string;
};

/** A manager of the artist at the Catalogue (artist_contacts). */
export type CatalogManager = {
  role: string;
  name: string;
  phone: string | null;
  isPrimary: boolean;
  createdAt: string;
  contactId: string | null;
};

/** The artist's main manager: a manager, the primary one first, else the
 * first added. */
export function mainManager(
  contacts: readonly CatalogManager[],
): CatalogManager | null {
  return (
    contacts
      .filter((c) => c.role === "manager")
      .sort(
        (a, b) =>
          Number(b.isPrimary) - Number(a.isPrimary) ||
          a.createdAt.localeCompare(b.createdAt),
      )[0] ?? null
  );
}

export function recapContact(input: {
  artistId: string;
  // The interlocutor's contact, when the participation has one the reader
  // reads.
  participation: ContactRow | null;
  manager: CatalogManager | null;
  // The manager's contact of the Réseau, when linked.
  managerContact: ContactRow | null;
}): RecapContact | null {
  if (input.participation)
    return {
      contactId: input.participation.id,
      name: input.participation.name,
      phone: input.participation.phone,
      hidden: input.participation.hidden,
      role: contactRoleOf(input.participation.roles),
      source: "participation",
      href: routes.networkContact(input.participation.id),
    };
  if (!input.manager) return null;
  // Linked to the Réseau: the Réseau's coordinates, never the Catalogue's
  // copy of a private contact's (décision 5).
  if (input.managerContact)
    return {
      contactId: input.managerContact.id,
      name: input.managerContact.name,
      phone: input.managerContact.phone,
      hidden: input.managerContact.hidden,
      // The Catalogue's manager of the artist, whatever the Réseau says.
      role: "manager",
      source: "catalog",
      href: routes.networkContact(input.managerContact.id),
    };
  if (input.manager.contactId) return null;
  return {
    contactId: null,
    name: input.manager.name,
    phone: input.manager.phone,
    hidden: false,
    role: "manager",
    source: "catalog",
    href: routes.artist(input.artistId),
  };
}

// ------------------------------------------------------------------- Fiche

/** A fiche de renseignements of the project (legal_forms), as loadForms
 * reads its state. */
export type FicheForm = {
  status: string;
  expiresAt: string;
  openedAt: string | null;
  complementFields: string[] | null;
  complementNote: string | null;
  complementRequestedAt: string | null;
};

const FORM_STATES: readonly FormState[] = [
  "none",
  "link_generated",
  "sent",
  "action_required",
  "complete",
  "expired",
  "revoked",
];

/**
 * The fiche in the Excel's three words (Ibé, 21/11: « Questionnaire
 * rempli : Oui / Non / En attente »), from the Juridique's finer status:
 * - toSend « À envoyer »: nothing sent (to create, link to send, link
 *   expired or revoked: to send again);
 * - waiting « En attente »: sent, the person has to act (not opened,
 *   opened, complement asked, incomplete, corrections asked);
 * - filled « Remplie »: received (to validate, validated).
 * The Juridique keeps its own words (« Complète · à valider »).
 */
export type RecapFicheState = "toSend" | "waiting" | "filled";

const FICHE_STATE_OF: Record<FicheStatus, RecapFicheState> = {
  toCreate: "toSend",
  toSend: "toSend",
  expired: "toSend",
  revoked: "toSend",
  sent: "waiting",
  opened: "waiting",
  complement: "waiting",
  incomplete: "waiting",
  corrections: "waiting",
  toValidate: "filled",
  validated: "filled",
};

export const recapFicheState = (status: FicheStatus): RecapFicheState =>
  FICHE_STATE_OF[status];

/** Waiting asks for attention, filled is done, to send is not started. */
export const RECAP_FICHE_TONE: Record<RecapFicheState, Tone> = {
  toSend: "neutral",
  waiting: "warning",
  filled: "success",
};

/** The person's fiche on this project: its status (as the Juridique says
 * it), its state in the recap's three words, and the person's démarche. */
export type RecapFiche = {
  status: FicheStatus;
  state: RecapFicheState;
  href: string;
};

/** The fiche's status, read as loadForms does: an open link past its date
 * is expired; none = « À créer ». */
export function recapFiche(
  form: FicheForm | null,
  submission: FormSubmission | null,
  now: string,
  href: string,
): RecapFiche {
  let input: Parameters<typeof ficheStatusOf>[0] = {
    state: "none",
    openedAt: null,
    submission: null,
    complement: null,
  };
  if (form) {
    const open = form.status === "link_generated" || form.status === "sent";
    const status = (FORM_STATES as readonly string[]).includes(form.status)
      ? (form.status as FormState)
      : "none";
    input = {
      state: open && form.expiresAt < now ? "expired" : status,
      openedAt: open ? form.openedAt : null,
      submission,
      complement:
        form.status === "action_required" && form.complementRequestedAt
          ? {
              fields: form.complementFields ?? [],
              note: form.complementNote,
              at: form.complementRequestedAt,
            }
          : null,
    };
  }
  const status = ficheStatusOf(input);
  return { status, state: recapFicheState(status), href };
}

/**
 * A fiche received, reduced to what its state needs and nothing of what the
 * person wrote (retour d'Ibé: the recap never shows a fiche's personal data:
 * address, birth, social security, bank details). The state of a fiche
 * (ficheStatusOf) asks only which required fields are filled and whether
 * corrections were asked: each required field filled becomes « · », the
 * corrections keep their names, no value; the contribution is not read. The
 * result holds no word of the person, so nothing of it can be shown or
 * sent to the browser.
 */
export function redactedSubmission(row: {
  roles: string[];
  person: Record<string, string>;
  corrections: readonly string[];
  submittedAt: string;
}): FormSubmission {
  const person: Record<string, string> = {};
  // The kind of person (a company or not) is no private data: it says which
  // fields are required.
  if (row.person.entity_type) person.entity_type = row.person.entity_type;
  for (const id of ficheNeeded(row.roles, row.person))
    if ((row.person[id] ?? "").trim() !== "") person[id] = "·";
  return {
    roles: row.roles,
    otherRole: null,
    person,
    contribution: {},
    corrections: Object.fromEntries(
      row.corrections.map((id) => [id, { before: "", after: "" }]),
    ),
    submittedAt: row.submittedAt,
  };
}

/**
 * What the recap never reads (the Juridique's personal data, retour d'Ibé du
 * 18/11/2026): the tables of a person's private details, and the columns
 * that hold them. `privateReadsOf` names what a `.select()` of the recap
 * would take; the only table of a fiche's content the recap opens is
 * legal_form_submissions, through redactedSubmission (its `person`,
 * `corrections`), for the state of a fiche.
 */
export const RECAP_PRIVATE_TABLES = [
  "contact_legal_details",
  "network_contact_private_details",
] as const;

export const RECAP_PRIVATE_COLUMNS = [
  // The fiche's fields (lib/legal/forms/definition.ts) and the identity.
  "address",
  "billing",
  "siret",
  "email",
  "city",
  "notes",
  "birth_date",
  "birth_place",
  "social_security",
  "ssn",
  "iban",
  "bic",
  "rib",
  "details",
  "contribution",
] as const;

// The columns of a fiche's submission: its content, reduced on reading.
const SUBMISSION_CONTENT = ["person", "corrections"];

/** What a `.from(table).select(columns)` would take that the recap must
 * not: the table itself, or a private column (embedded relations and
 * aliases included). Empty: clean. */
export function privateReadsOf(table: string, columns: string): string[] {
  if ((RECAP_PRIVATE_TABLES as readonly string[]).includes(table))
    return [table];
  const names = columns
    .split(/[\s,()]+/)
    .map((token) => token.split(":").pop()!.split("!")[0])
    .filter(Boolean);
  return names.filter(
    (name) =>
      (RECAP_PRIVATE_COLUMNS as readonly string[]).includes(name) ||
      (table !== "legal_form_submissions" && SUBMISSION_CONTENT.includes(name)),
  );
}

/** A person of the title in the recap (a beatmaker): name and fiche (null
 * when the reader may not read the Juridique). */
export type RecapPerson = {
  name: string;
  contactId: string | null;
  fiche: RecapFiche | null;
};

/** A credit of the project's titles (master_contributors). */
export type RecapCredit = {
  masterId: string;
  name: string;
  role: string;
  contactId: string | null;
};

/** A beatmaker makes the beat: composer, producer or co-producer
 * (contributor-groups' « beatmaker », plus the co-producer). */
export const BEATMAKER_ROLES = ["composer", "producer", "co_producer"];

/** The beatmakers of a master, one per person (their contact, else their
 * name), in credit order. `contactOf`: the contact known for a name on the
 * project (the Juridique's person takes the first one, formPeople). */
export function beatmakersOf(
  credits: readonly RecapCredit[],
  masterId: string,
  contactOf: (name: string) => string | null,
): Array<{ name: string; contactId: string | null }> {
  const people = new Map<string, { name: string; contactId: string | null }>();
  for (const credit of credits) {
    if (credit.masterId !== masterId) continue;
    if (!BEATMAKER_ROLES.includes(credit.role)) continue;
    const contactId = credit.contactId ?? contactOf(credit.name);
    const key = contactId ?? `name:${normalizeSearch(credit.name)}`;
    if (!people.has(key)) people.set(key, { name: credit.name, contactId });
  }
  return [...people.values()];
}

/**
 * The key of a person's démarche in the Juridique (formPeople's person,
 * lib/legal/forms/people.ts): a credited person is keyed by the name of the
 * credit (across titles); a guest artist by the credit of their contact
 * when they have one, else, not in the Réseau, by a credit of their name (a
 * collective merges them), else their contact (`contact:`), else their
 * artist page (`artist:`).
 */
export function personKeyOf(input: {
  credits: readonly RecapCredit[];
  contactId: string | null;
  artist?: { id: string; name: string };
  // A credited person (a beatmaker): the credit's name.
  creditName?: string;
}): string {
  if (input.creditName) return normalizeSearch(input.creditName);
  const credited = input.contactId
    ? input.credits.find((c) => c.contactId === input.contactId)
    : undefined;
  if (credited) return normalizeSearch(credited.name);
  if (input.contactId) return `contact:${input.contactId}`;
  const name = input.artist ? normalizeSearch(input.artist.name) : null;
  if (name && input.credits.some((c) => normalizeSearch(c.name) === name))
    return name;
  return `artist:${input.artist?.id ?? ""}`;
}

// ---------------------------------------------------------------- Contract

/**
 * A contract sent whose signed copy is back (the table CONTRATS of the
 * Excel: « Contrat envoyé ? », « Contrat signé »). The person signs first,
 * then PDS (migration 20261107200101): the copy is back when the person
 * dropped it by their private link, or the team dropped it with the proof
 * « signé autrement » (the rule of the contract's page, contractNowOf);
 * - countersign: back, PDS has not signed yet (« à contresigner »);
 * - check: back and countersigned, the team checks the signature and marks
 *   the contract signed (« à vérifier »).
 * Null: not back (still « en attente de retour »), or not sent.
 */
export type ContractBack = "countersign" | "check";

export type ContractProof = {
  // The signed copies of the contract (contract_files, category signed):
  // how many, and whether one came by the person's link.
  signedFiles: number;
  signedViaLink: boolean;
  // The proof « signé autrement » (category evidence) is kept.
  evidence: boolean;
  countersigned: boolean;
};

export function contractBackOf(
  input: ContractProof & { state: AgreementState },
): ContractBack | null {
  if (input.state !== "signature_pending") return null;
  const back = input.signedViaLink || (input.signedFiles > 0 && input.evidence);
  if (!back) return null;
  return input.countersigned ? "check" : "countersign";
}

/**
 * The artist's contract on this project (one per person: legal_agreement_
 * needs → contracts), for a participation:
 * - agreement: where it stands (the Juridique's AgreementState: the
 *   contract's own state once drafted, « Contrat nécessaire » before);
 * - waiting_agreement: confirmed, and the artist has a participation in
 *   play whose accord is not validated: no contract before the accord
 *   (§ 3.5, the database refuses to draft it), « En attente de l'accord »;
 * - hidden: a contract the reader may not read;
 * - none: not expected yet (proposed, invited) or no longer.
 */
export type RecapContract =
  | { kind: "agreement"; state: AgreementState; back: ContractBack | null }
  | { kind: "waiting_agreement" }
  | { kind: "hidden" }
  | { kind: "none" };

export function recapContract(input: {
  status: ParticipationStatus;
  // The artist has a participation in play (title not abandoned) whose
  // accord is not validated (artistsAwaitingAgreement).
  artistPending: boolean;
  // The person's need, when the Juridique planned one.
  need: {
    contractId: string | null;
    contract: ContractState | null;
    // What the contract's files say (contractBackOf's input).
    proof: ContractProof;
  } | null;
}): RecapContract {
  const { need } = input;
  if (need?.contractId) {
    if (!need.contract) return { kind: "hidden" };
    const state = agreementStateOf({
      mapped: true,
      mappingApproved: true,
      contract: need.contract,
      ready: false,
    });
    return {
      kind: "agreement",
      state,
      back: contractBackOf({ state, ...need.proof }),
    };
  }
  const confirmed = input.status === "confirmed";
  if (confirmed && input.artistPending) return { kind: "waiting_agreement" };
  if (need) return { kind: "agreement", state: "needs_info", back: null };
  if (confirmed) return { kind: "agreement", state: "unmapped", back: null };
  return { kind: "none" };
}

/** The artists whose contract waits for an accord, as the database reads
 * it (artist_agreement_pending): a participation neither declined nor
 * withdrawn, on a title not abandoned, without its accord validated. */
export function artistsAwaitingAgreement(
  titles: ReadonlyArray<{
    status: string;
    participations: ReadonlyArray<{
      id: string;
      status: ParticipationStatus;
      artist: { id: string };
    }>;
  }>,
  validated: (participationId: string) => boolean,
): Set<string> {
  const pending = new Set<string>();
  for (const title of titles) {
    if (title.status === "abandoned") continue;
    for (const p of title.participations)
      if (isActiveParticipation(p.status) && !validated(p.id))
        pending.add(p.artist.id);
  }
  return pending;
}

// ------------------------------------------------------------------ Accord

/**
 * The participation's accord (the Business module, Sacha 20-21/11): its
 * deal's stage and accord (participation_deal_state, for whoever sees the
 * project), and what the reader reads of the deal itself (its negotiator,
 * its rate, its page). `call`: the row's « Caler le call », when shown.
 */
export type RecapAccord = {
  dealId: string | null;
  stage: DealStage | null;
  agreementStatus: AgreementStatus | null;
  agreementValidated: boolean;
  nextCallAt: string | null;
  lastCallAt: string | null;
  // Who negotiates; null: none yet, or the deal is not read.
  negotiator: string | null;
  // « 50 % »: the deal's « Part du master » (master_split), proposed or
  // confirmed; null: not said yet, or the deal is not read.
  rate: string | null;
  // The deal's page, when the reader reads the deal.
  href: string | null;
  canPlanCall: boolean;
  showPlanCall: boolean;
  call: NegotiationCallTarget | null;
};

/** « Caler le call » on a row (Ibé 18/11, 1:00:28): the artist agreed, no
 * call planned yet, and the reader may plan it. Gone once a call is. */
export function showPlanCall(input: {
  status: ParticipationStatus;
  nextCallAt: string | null;
  canPlanCall: boolean;
}): boolean {
  return input.status === "confirmed" && !input.nextCallAt && input.canPlanCall;
}

/** The rate as the Excel says it (« 50 % »), from the stored value of the
 * deal's master_split; null when not said or unreadable. */
export function recapRate(raw: unknown): string | null {
  return formatTermValue("percent", parseTermValue("percent", raw));
}

// ------------------------------------------------------------------ Recap

export type RecapParticipationFacts = {
  contactState: ContactState | null;
  note: string | null;
  contact: RecapContact | null;
  // The fiche of the artist's person (the contact of the Réseau linked to
  // the artist); null: the reader may not read the Juridique.
  fiche: RecapFiche | null;
  // Null: the reader may not read the Juridique. `href`: the person's
  // démarche.
  contract: { state: RecapContract; href: string } | null;
  // Null: the reader sees no deal of the project (dealReach « none »).
  accord: RecapAccord | null;
};

export type RecapParticipation = BoardParticipation & {
  recap: RecapParticipationFacts;
};

export type RecapTitleFacts = {
  label: string;
  releaseDecision: boolean | null;
  beatmakers: RecapPerson[];
};

export type RecapTitle = Omit<BoardTitle, "participations"> & {
  participations: RecapParticipation[];
  recap: RecapTitleFacts;
};

export type TitleRecap = Omit<TitleBoard, "titles"> & {
  titles: RecapTitle[];
  counts: Record<ContactState, number>;
  call: SharedNegotiationCall | null;
  canReadLegal: boolean;
  canEditNetwork: boolean;
};
