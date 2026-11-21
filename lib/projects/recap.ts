import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import {
  asContractStatus,
  contractStateOf,
  todayInParis,
} from "@/lib/contracts/types";
import { dealName } from "@/lib/deals/names";
import { loadSharedNegotiationCall } from "@/lib/deals/negotiation-call";
import {
  negotiationTopics,
  type NegotiationCallTarget,
} from "@/lib/deals/negotiation-call-rules";
import { loadParticipationDealStates } from "@/lib/deals/participation-states";
import type { FormSubmission } from "@/lib/legal/forms/queries";
import { withPrivateDetails } from "@/lib/network/private-details";
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
  showPlanCall,
  type CatalogManager,
  type ContactRow,
  type ContractProof,
  type FicheForm,
  type RecapAccord,
  type RecapCredit,
  type TitleRecap,
} from "@/lib/projects/recap-rules";
import { loadTitleBoard } from "@/lib/projects/title-board";
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
  const [board, titleRows, partRows, states, forms, needs] = await Promise.all([
    loadTitleBoard(project, access),
    supabase
      .from("project_titles")
      .select("id, release_decision")
      .eq("project_id", project.id),
    supabase
      .from("title_participations")
      .select("id, note, contact_id")
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
    canReadLegal
      ? supabase
          .from("legal_agreement_needs")
          .select("contact_id, contract_id")
          .eq("project_id", project.id)
      : Promise.resolve(none),
  ]);
  // A failed read is not « not decided », « no note » or « no fiche »:
  // thrown to the error page rather than shown as empty.
  for (const [scope, result] of Object.entries({
    titleRows,
    partRows,
    forms,
    needs,
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
  const contractIds = (needs.data ?? []).flatMap((n) =>
    n.contract_id ? [n.contract_id] : [],
  );
  const [
    credits,
    artistPeople,
    managers,
    terms,
    submissions,
    contracts,
    contractFiles,
    call,
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
      ? supabase
          .from("legal_form_submissions")
          .select(
            "form_id, roles, other_role, person, contribution, corrections, created_at",
          )
          .in("form_id", formIds)
          .order("created_at", { ascending: false })
      : Promise.resolve(none),
    // A contract the reader may not read stays unread (contracts_select_
    // visible): « hidden », never « missing ».
    contractIds.length
      ? supabase
          .from("contracts")
          .select("id, status, ends_on, pds_signed_at")
          .in("id", contractIds)
      : Promise.resolve(none),
    // Whether a signed copy is back (« Retour reçu »): which files exist,
    // never their names or paths.
    contractIds.length
      ? supabase
          .from("contract_files")
          .select("contract_id, category, via_contact_id")
          .in("contract_id", contractIds)
          .in("category", ["signed", "evidence"])
      : Promise.resolve(none),
    planning.length && planCalls ? loadSharedNegotiationCall(assignees) : null,
  ]);
  for (const [scope, result] of Object.entries({
    credits,
    artistPeople,
    managers,
    terms,
    submissions,
    contracts,
    contractFiles,
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
        .select("id, name, phone, private_owner_person_id")
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
      },
    ]),
  );

  // The Juridique: the latest fiche of each contact, its submission, the
  // person's contract.
  const now = new Date().toISOString();
  const today = todayInParis(new Date());
  const formOf = latestForms(forms.data ?? []);
  const submissionOf = new Map<string, FormSubmission>();
  for (const s of submissions.data ?? [])
    if (!submissionOf.has(s.form_id))
      submissionOf.set(s.form_id, {
        roles: s.roles,
        otherRole: s.other_role,
        person: texts(s.person),
        contribution: texts(s.contribution),
        corrections: Object.fromEntries(
          Object.entries(record(s.corrections)).map(([k, v]) => [
            k,
            {
              before: String(record(v).before ?? ""),
              after: String(record(v).after ?? ""),
            },
          ]),
        ),
        submittedAt: s.created_at,
      });
  const contractOf = new Map(
    (contracts.data ?? []).map((c) => [
      c.id,
      contractStateOf(
        { status: asContractStatus(c.status), endsOn: c.ends_on },
        today,
      ),
    ]),
  );
  const proofOf = new Map<string, ContractProof>();
  for (const c of contracts.data ?? [])
    proofOf.set(c.id, {
      signedFiles: 0,
      signedViaLink: false,
      evidence: false,
      countersigned: c.pds_signed_at !== null,
    });
  for (const f of contractFiles.data ?? []) {
    const proof = proofOf.get(f.contract_id);
    if (!proof) continue;
    if (f.category === "signed") {
      proof.signedFiles += 1;
      if (f.via_contact_id) proof.signedViaLink = true;
    }
    if (f.category === "evidence") proof.evidence = true;
  }
  const needOf = new Map(
    (needs.data ?? []).map((n) => [
      n.contact_id,
      {
        contractId: n.contract_id,
        contract: n.contract_id
          ? (contractOf.get(n.contract_id) ?? null)
          : null,
        proof: (n.contract_id ? proofOf.get(n.contract_id) : undefined) ?? {
          signedFiles: 0,
          signedViaLink: false,
          evidence: false,
          countersigned: false,
        },
      },
    ]),
  );
  const ficheOf = (contactId: string | null, key: string) => {
    const form = contactId ? formOf.get(contactId) : undefined;
    return recapFiche(
      form ? ficheForm(form) : null,
      form ? (submissionOf.get(form.id) ?? null) : null,
      now,
      legalDemarcheHref(project.id, "person", key),
    );
  };

  const recapCredits: RecapCredit[] = (credits.data ?? []).map((c) => ({
    masterId: c.master_id,
    name: c.name,
    role: c.role,
    contactId: c.contact_id,
  }));
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
  const pending = artistsAwaitingAgreement(
    board.titles,
    (id) => states.get(id)?.agreementValidated ?? false,
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
                      personKeyOf({
                        credits: recapCredits,
                        contactId: person.contactId,
                        creditName: person.name,
                      }),
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
          const href = legalDemarcheHref(project.id, "person", key);
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
                  contactId: null,
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
              fiche: canReadLegal ? ficheOf(person, key) : null,
              contract: canReadLegal
                ? {
                    state: recapContract({
                      status: p.status,
                      artistPending: pending.has(p.artist.id),
                      need: person ? (needOf.get(person) ?? null) : null,
                    }),
                    href,
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
