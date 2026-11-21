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
};

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
      source: "catalog",
      href: routes.networkContact(input.managerContact.id),
    };
  if (input.manager.contactId) return null;
  return {
    contactId: null,
    name: input.manager.name,
    phone: input.manager.phone,
    hidden: false,
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
  | { kind: "agreement"; state: AgreementState }
  | { kind: "waiting_agreement" }
  | { kind: "hidden" }
  | { kind: "none" };

export function recapContract(input: {
  status: ParticipationStatus;
  // The artist has a participation in play (title not abandoned) whose
  // accord is not validated (artistsAwaitingAgreement).
  artistPending: boolean;
  // The person's need, when the Juridique planned one.
  need: { contractId: string | null; contract: ContractState | null } | null;
}): RecapContract {
  const { need } = input;
  if (need?.contractId)
    return need.contract
      ? {
          kind: "agreement",
          state: agreementStateOf({
            mapped: true,
            mappingApproved: true,
            contract: need.contract,
            ready: false,
          }),
        }
      : { kind: "hidden" };
  const confirmed = input.status === "confirmed";
  if (confirmed && input.artistPending) return { kind: "waiting_agreement" };
  if (need) return { kind: "agreement", state: "needs_info" };
  if (confirmed) return { kind: "agreement", state: "unmapped" };
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
