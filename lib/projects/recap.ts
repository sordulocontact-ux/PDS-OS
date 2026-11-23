import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { pickCallGuests } from "@/lib/deals/call-guests-rules";
import { dealName } from "@/lib/deals/names";
import { loadSharedNegotiationCall } from "@/lib/deals/negotiation-call";
import {
  negotiationTopics,
  type NegotiationCallTarget,
} from "@/lib/deals/negotiation-call-rules";
import {
  loadParticipationDealStates,
  type ParticipationDealState,
} from "@/lib/deals/participation-states";
import { FORM_ROLES } from "@/lib/legal/forms/definition";
import type { FormSubmission } from "@/lib/legal/forms/queries";
import { withPrivateDetails } from "@/lib/network/private-details";
import { networkRolesOf } from "@/lib/network/types";
import {
  artistsAwaitingAgreement,
  beatmakersOf,
  contactStateOf,
  mainManager,
  personKeyOf,
  recapContact,
  recapContract,
  recapCounts,
  recapFiche,
  recapRate,
  redactedSubmission,
  showPlanCall,
  type CatalogManager,
  type ContactRow,
  type FicheForm,
  type RecapAccord,
  type RecapFiche,
  type RecapContract,
  type RecapCredit,
  type TitleRecap,
} from "@/lib/projects/recap-rules";
import { loadTitleBoard } from "@/lib/projects/title-board";
import type { BoardTitle } from "@/lib/projects/title-board-rules";
import {
  masterNameOf,
  projectTitleLabel,
  titleGuestNames,
} from "@/lib/projects/title-rules";
import { createClient } from "@/lib/supabase/server";
import { legalDemarcheHref } from "@/lib/ui/legal-steps";
import { normalizeSearch } from "@/lib/utils/search";

const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
const texts = (v: unknown): Record<string, string> =>
  Object.fromEntries(
    Object.entries(record(v)).map(([k, x]) => [k, String(x ?? "")]),
  );

// PRIVACY (retours d'Ibé du 18/11/2026): the recap, in the page and in its
// compact version, never reads, keeps or sends to the browser a person's
// private data: birth date and place, social security number, address,
// bank details, e-mail (tables legal_form_submissions, contact_legal_details,
// fields of lib/legal/forms/definition.ts). A contact's name and phone are
// expected (the Excel's TEL). The only read of a fiche's content is its
// state (« À envoyer », « En attente », « Remplie »), reduced at once to
// « which required fields are filled » (redactedSubmission). `privateReadsOf`
// (recap-rules.ts) names what a `.select()` must not take: run it over every
// `.select()` of this file, title-board.ts and titles.ts when one is added.

/**
 * The collective's recap (retours d'Ibé du 18/11/2026, lot 2): the board of
 * « Titres et artistes » (loadTitleBoard) and, for each title and each
 * participation, what the Excel of the team holds (recap-rules.ts: the
 * shape). Grouped reads, never one per row; everything with the viewer's
 * session, so RLS decides: a contact is read as the Réseau gives it (a
 * private contact's coordinates the reader may not read stay hidden,
 * décision 5: no SECURITY DEFINER reads a contact), fiches and contracts
 * only with manage_legal, the Catalogue's managers only with
 * manage_catalog, a deal's negotiator and rate only by who reads the deal.
 * « Caler le call »'s shared data is read once, only when a row may plan.
 */
export async function loadTitleRecap(
  project: { id: string; ownerPersonId: string | null },
  access: Access,
  // false: no row shows « Caler le call » (the overview's compact recap,
  // read only), so its shared data (free slots, contacts) is not read.
  { planCalls = true }: { planCalls?: boolean } = {},
): Promise<TitleRecap> {
  const supabase = await createClient();
  const canReadLegal = can(access, "manage_legal");
  const none = { data: [], error: null };
  const [board, titleRows, partRows, states, forms] = await Promise.all([
    loadTitleBoard(project, access),
    supabase
      .from("project_titles")
      .select("id, release_decision")
      .eq("project_id", project.id),
    supabase
      .from("title_participations")
      .select("id, note, contact_id, contact_label")
      .eq("project_id", project.id),
    loadParticipationDealStates(project.id),
    canReadLegal
      ? supabase
          .from("legal_forms")
          .select(
            "id, contact_id, status, expires_at, opened_at, complement_fields, complement_note, complement_requested_at, created_at",
          )
          .eq("project_id", project.id)
          .order("created_at", { ascending: false })
      : Promise.resolve(none),
  ]);
  // A failed read is not « not decided », « no note » or « no fiche »:
  // thrown to the error page rather than shown as empty.
  for (const [scope, result] of Object.entries({
    titleRows,
    partRows,
    forms,
  }))
    if (result.error)
      throw new Error(`loadTitleRecap ${scope}: ${result.error.message}`);

  const participations = board.titles.flatMap((t) => t.participations);
  const artistIds = [...new Set(participations.map((p) => p.artist.id))];
  const masterIds = board.titles.flatMap((t) =>
    t.master ? [t.master.id] : [],
  );
  const partOf = new Map((partRows.data ?? []).map((row) => [row.id, row]));
  const dealIds = [
    ...new Set(participations.flatMap((p) => (p.deal ? [p.deal.id] : []))),
  ];

  // Who may plan a call, and on what (the deal's negotiator plans on his
  // own free slots): the shared data of « Caler le call » is read once.
  const planning = participations.filter((p) => {
    const state = states.get(p.id);
    return (
      board.dealReach !== "none" &&
      state !== undefined &&
      showPlanCall({
        status: p.status,
        nextCallAt: state.nextCallAt,
        canPlanCall: state.canPlanCall,
      })
    );
  });
  const assignees = planning.flatMap((p) =>
    p.deal?.assigneeId && p.deal.assignee && p.deal.stage !== "abandoned"
      ? [{ id: p.deal.assigneeId, name: p.deal.assignee }]
      : [],
  );

  const formIds = [...latestForms(forms.data ?? []).values()]
    .filter((f) => f.status === "action_required")
    .map((f) => f.id);
  const [
    credits,
    artistPeople,
    managers,
    terms,
    submissions,
    call,
    contractStates,
    legalContacts,
  ] = await Promise.all([
    masterIds.length
      ? supabase
          .from("master_contributors")
          .select("master_id, name, role, contact_id, created_at")
          .in("master_id", masterIds)
          .order("created_at")
      : Promise.resolve(none),
    artistIds.length
      ? supabase
          .from("network_contacts")
          .select("id, artist_id, created_at")
          .in("artist_id", artistIds)
          .is("archived_at", null)
          .order("created_at")
      : Promise.resolve(none),
    // Read with manage_catalog only (RLS): none for anyone else.
    artistIds.length
      ? supabase
          .from("artist_contacts")
          .select(
            "artist_id, role, name, phone, is_primary, created_at, contact_id",
          )
          .in("artist_id", artistIds)
          .eq("role", "manager")
      : Promise.resolve(none),
    // Whoever reads the deal reads its terms (deal_terms_select).
    dealIds.length && board.dealReach !== "none"
      ? supabase
          .from("deal_terms")
          .select("deal_id, term_key, value, state")
          .in("deal_id", dealIds)
      : Promise.resolve(none),
    formIds.length
      ? // The content of a fiche is read for its state only, then redacted
        // (redactedSubmission): never kept, shown or sent to the browser.
        supabase
          .from("legal_form_submissions")
          .select("form_id, roles, person, corrections, created_at")
          .in("form_id", formIds)
          .order("created_at", { ascending: false })
      : Promise.resolve(none),
    planning.length && planCalls ? loadSharedNegotiationCall(assignees) : null,
    canReadLegal
      ? loadContractStates(project.id, board.titles, states)
      : new Map<string, RecapContract>(),
    // The people of the Réseau added to the legal file without a credit
    // (formPeople's `added`): each has a démarche. With manage_legal (RLS).
    canReadLegal
      ? supabase
          .from("legal_project_contacts")
          .select("contact_id, role")
          .eq("project_id", project.id)
      : Promise.resolve(none),
  ]);
  for (const [scope, result] of Object.entries({
    legalContacts,
    credits,
    artistPeople,
    managers,
    terms,
    submissions,
  }))
    if (result.error)
      throw new Error(`loadTitleRecap ${scope}: ${result.error.message}`);

  // The contacts to read: each participation's interlocutor, each artist's
  // manager linked to the Réseau. Coordinates merged as the Réseau gives
  // them to this reader (withPrivateDetails).
  const managerOf = new Map<string, CatalogManager>();
  for (const artistId of artistIds) {
    const manager = mainManager(
      (managers.data ?? [])
        .filter((m) => m.artist_id === artistId)
        .map((m) => ({
          role: m.role,
          name: m.name,
          phone: m.phone,
          isPrimary: m.is_primary,
          createdAt: m.created_at,
          contactId: m.contact_id,
        })),
    );
    if (manager) managerOf.set(artistId, manager);
  }
  const contactIds = [
    ...new Set([
      ...(partRows.data ?? []).flatMap((p) =>
        p.contact_id ? [p.contact_id] : [],
      ),
      ...[...managerOf.values()].flatMap((m) =>
        m.contactId ? [m.contactId] : [],
      ),
    ]),
  ];
  const contacts = contactIds.length
    ? await supabase
        .from("network_contacts")
        .select("id, name, phone, roles, private_owner_person_id")
        .in("id", contactIds)
    : none;
  if (contacts.error)
    throw new Error(`loadTitleRecap contacts: ${contacts.error.message}`);
  const coordinates = await withPrivateDetails(supabase, contacts.data ?? []);
  const contactOf = new Map<string, ContactRow>(
    coordinates.rows.map((c) => [
      c.id,
      {
        id: c.id,
        name: c.name,
        phone: coordinates.hidden.has(c.id) ? null : (c.phone ?? null),
        hidden: coordinates.hidden.has(c.id),
        roles: networkRolesOf(c.roles),
      },
    ]),
  );

  // The Juridique: the latest fiche of each contact, its submission, the
  // person's need. The contract is the participation's (loadTitleBoard:
  // title_participations.contract_id, the banner's and the locks' source).
  const now = new Date().toISOString();
  const formOf = latestForms(forms.data ?? []);
  const submissionOf = new Map<string, FormSubmission>();
  for (const s of submissions.data ?? [])
    if (!submissionOf.has(s.form_id))
      submissionOf.set(
        s.form_id,
        redactedSubmission({
          roles: s.roles,
          person: texts(s.person),
          corrections: Object.keys(record(s.corrections)),
          submittedAt: s.created_at,
        }),
      );
  // The fiche's pill opens the fiche itself in the person's démarche
  // (`?partie=fiche`, JUR-10), filled or not, even while their contract is
  // the part at work (Maël 22/11/2026): the Juridique shows it, under its
  // own rights, never the recap. No démarche: no link.
  const ficheOf = (
    contactId: string | null,
    demarche: string | null,
  ): RecapFiche => {
    const form = contactId ? formOf.get(contactId) : undefined;
    return recapFiche(
      form ? ficheForm(form) : null,
      form ? (submissionOf.get(form.id) ?? null) : null,
      now,
      demarche ? `${demarche}?partie=fiche` : null,
    );
  };

  const recapCredits: RecapCredit[] = (credits.data ?? []).map((c) => ({
    masterId: c.master_id,
    name: c.name,
    role: c.role,
    contactId: c.contact_id,
  }));
  // Who has a démarche in the Juridique, as formPeople lists them (lib/
  // legal/forms/people.ts): a person credited on a master of the project,
  // an artist featured on one (titles abandoned left out: out of the
  // Master, lot 9), a contact added to the legal file. A guest of a title
  // not in the Catalogue yet, or not credited on it yet, has none (a contract
  // planned makes none either): their fiche and contract have no page to
  // open, a link would lead to « Page introuvable ».
  const liveTitles = board.titles.filter((t) => t.status !== "abandoned");
  const liveMasters = new Set(liveTitles.flatMap((t) => t.master?.id ?? []));
  const creditedKeys = new Set(
    recapCredits
      .filter((c) => liveMasters.has(c.masterId))
      .map((c) => normalizeSearch(c.name)),
  );
  const featured = new Set(
    liveTitles.flatMap((t) =>
      (t.master?.credits ?? [])
        .filter((c) => c.role === "featuring")
        .map((c) => c.artist.id),
    ),
  );
  const added = new Set(
    (legalContacts.data ?? []).flatMap((c) =>
      (FORM_ROLES as readonly string[]).includes(c.role) ? [c.contact_id] : [],
    ),
  );
  const demarcheOf = (
    key: string,
    who: { artistId: string | null; contactId: string | null },
  ) =>
    creditedKeys.has(key) ||
    (who.artistId !== null && featured.has(who.artistId)) ||
    (who.contactId !== null && added.has(who.contactId))
      ? legalDemarcheHref(project.id, "person", key)
      : null;
  // The contact a name has on the project (the first credit that links
  // one), as the Juridique's person (formPeople).
  const nameContact = new Map<string, string>();
  for (const c of recapCredits)
    if (c.contactId && !nameContact.has(normalizeSearch(c.name)))
      nameContact.set(normalizeSearch(c.name), c.contactId);
  // The artist's person of the Réseau (network_contacts.artist_id).
  const personOf = new Map<string, string>();
  for (const row of artistPeople.data ?? [])
    if (row.artist_id && !personOf.has(row.artist_id))
      personOf.set(row.artist_id, row.id);

  const termsOf = new Map<
    string,
    Array<{ key: string; value: unknown; state: string }>
  >();
  for (const row of terms.data ?? []) {
    const list = termsOf.get(row.deal_id) ?? [];
    list.push({ key: row.term_key, value: row.value, state: row.state });
    termsOf.set(row.deal_id, list);
  }
  const releaseOf = new Map(
    (titleRows.data ?? []).map((t) => [t.id, t.release_decision]),
  );

  return {
    ...board,
    counts: recapCounts(board.titles),
    call,
    canReadLegal,
    canEditNetwork: can(access, "manage_network"),
    titles: board.titles.map((title) => {
      const label = projectTitleLabel({
        position: title.position,
        workingTitle: title.workingTitle,
        masterTitle: masterNameOf(title.master),
        artists: titleGuestNames(title.participations),
      });
      return {
        ...title,
        recap: {
          label,
          releaseDecision: releaseOf.get(title.id) ?? null,
          beatmakers: title.master
            ? beatmakersOf(
                recapCredits,
                title.master.id,
                (name) => nameContact.get(normalizeSearch(name)) ?? null,
              ).map((person) => ({
                ...person,
                fiche: canReadLegal
                  ? ficheOf(
                      person.contactId,
                      demarcheOf(
                        personKeyOf({
                          credits: recapCredits,
                          contactId: person.contactId,
                          creditName: person.name,
                        }),
                        { artistId: null, contactId: person.contactId },
                      ),
                    )
                  : null,
              }))
            : [],
        },
        participations: title.participations.map((p) => {
          const row = partOf.get(p.id);
          const state = states.get(p.id);
          const manager = managerOf.get(p.artist.id) ?? null;
          const person = personOf.get(p.artist.id) ?? null;
          const key = personKeyOf({
            credits: recapCredits,
            contactId: person,
            artist: p.artist,
          });
          const demarche = demarcheOf(key, {
            artistId: p.artist.id,
            contactId: person,
          });
          // The deal the board reads is the one the state speaks of.
          const deal = p.deal && state?.dealId === p.deal.id ? p.deal : null;
          let accord: RecapAccord | null = null;
          if (board.dealReach !== "none") {
            const shown = state
              ? showPlanCall({
                  status: p.status,
                  nextCallAt: state.nextCallAt,
                  canPlanCall: state.canPlanCall,
                })
              : false;
            // A live deal plans on itself; none (or only an abandoned
            // one): the gesture opens a new deal on the participation.
            const onDeal =
              state?.dealId && state.stage && state.stage !== "abandoned"
                ? { dealId: state.dealId, stage: state.stage }
                : null;
            const target: NegotiationCallTarget | null = shown
              ? {
                  target: onDeal
                    ? { dealId: onDeal.dealId }
                    : { participationId: p.id },
                  name: dealName({
                    artistName: p.artist.name,
                    titleLabel: label,
                    titlePosition: title.position,
                    projectTitle: null,
                  }),
                  assigneeId: onDeal ? (deal?.assigneeId ?? null) : null,
                  contactId: managerOf.get(p.artist.id)?.contactId ?? null,
                  // The deal's own contacts are read on its page; here the
                  // artist's manager, else the artist (Sacha 23/11/2026).
                  guestIds: pickCallGuests({
                    people: [managerOf.get(p.artist.id)?.contactId ?? null],
                    counterpartId: null,
                    artistContactId: personOf.get(p.artist.id) ?? null,
                  }),
                  topics: negotiationTopics(
                    onDeal ? { stage: onDeal.stage } : null,
                    onDeal ? (termsOf.get(onDeal.dealId) ?? []) : [],
                  ),
                }
              : null;
            accord = {
              dealId: state?.dealId ?? null,
              stage: state?.stage ?? null,
              agreementStatus: state?.agreementStatus ?? null,
              agreementValidated: state?.agreementValidated ?? false,
              nextCallAt: state?.nextCallAt ?? null,
              lastCallAt: state?.lastCallAt ?? null,
              negotiator: deal?.assignee ?? null,
              rate: deal
                ? recapRate(
                    termsOf.get(deal.id)?.find((t) => t.key === "master_split")
                      ?.value,
                  )
                : null,
              href: deal ? routes.deal(deal.id) : null,
              canPlanCall: state?.canPlanCall ?? false,
              showPlanCall: shown,
              call: target,
            };
          }
          const contact = recapContact({
            artistId: p.artist.id,
            participation: row?.contact_id
              ? (contactOf.get(row.contact_id) ?? null)
              : null,
            participationLabel: row?.contact_label ?? null,
            manager,
            managerContact: manager?.contactId
              ? (contactOf.get(manager.contactId) ?? null)
              : null,
          });
          if (accord?.call) accord.call.contactId = contact?.contactId ?? null;
          return {
            ...p,
            recap: {
              contactState: contactStateOf(p.status),
              note: row?.note ?? null,
              contact,
              fiche: canReadLegal ? ficheOf(person, demarche) : null,
              contract: canReadLegal
                ? {
                    state: contractStates.get(p.id) ?? { kind: "none" },
                    href: demarche,
                  }
                : null,
              accord,
            },
          };
        }),
      };
    }),
  };
}

/**
 * The state of each participation's contract, by participation
 * (RecapContract): its contract (the board's, title_participations.
 * contract_id, the banner's and the locks' source), else « En attente de
 * l'accord », else « À rédiger » (the Juridique planned the person's
 * contract, or the participation is confirmed). Read by the recap and by
 * « Participations et contrats », so both say the same. With manage_legal
 * only (legal_agreement_needs under RLS); no contact returned, only which
 * artists have a person with a need.
 */
export async function loadContractStates(
  projectId: string,
  titles: BoardTitle[],
  states: Map<string, ParticipationDealState>,
): Promise<Map<string, RecapContract>> {
  const supabase = await createClient();
  const needs = await supabase
    .from("legal_agreement_needs")
    .select("contact_id")
    .eq("project_id", projectId);
  if (needs.error)
    throw new Error(`loadContractStates needs: ${needs.error.message}`);
  const contactIds = [...new Set((needs.data ?? []).map((n) => n.contact_id))];
  const people = contactIds.length
    ? await supabase
        .from("network_contacts")
        .select("artist_id")
        .in("id", contactIds)
        .not("artist_id", "is", null)
    : { data: [], error: null };
  if (people.error)
    throw new Error(`loadContractStates people: ${people.error.message}`);
  const needed = new Set(
    (people.data ?? []).flatMap((c) => (c.artist_id ? [c.artist_id] : [])),
  );
  const pending = artistsAwaitingAgreement(
    titles,
    (id) => states.get(id)?.agreementValidated ?? false,
  );
  return new Map(
    titles.flatMap((title) =>
      title.participations.map((p) => [
        p.id,
        recapContract({
          status: p.status,
          artistPending: pending.has(p.artist.id),
          contract: p.contract,
          needed: needed.has(p.artist.id),
        }),
      ]),
    ),
  );
}

type FormRowDb = {
  id: string;
  contact_id: string;
  status: string;
  expires_at: string;
  opened_at: string | null;
  complement_fields: string[] | null;
  complement_note: string | null;
  complement_requested_at: string | null;
};

/** The latest fiche of each contact (rows come newest first). */
function latestForms<T extends FormRowDb>(rows: readonly T[]): Map<string, T> {
  const latest = new Map<string, T>();
  for (const form of rows)
    if (!latest.has(form.contact_id)) latest.set(form.contact_id, form);
  return latest;
}

const ficheForm = (form: FormRowDb): FicheForm => ({
  status: form.status,
  expiresAt: form.expires_at,
  openedAt: form.opened_at,
  complementFields: form.complement_fields,
  complementNote: form.complement_note,
  complementRequestedAt: form.complement_requested_at,
});
