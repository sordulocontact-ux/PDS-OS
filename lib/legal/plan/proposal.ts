// The plan d'action PO proposes once the dossier is confirmed (tickets
// Juridique 01 and 07). Pure, decided by code from the dossier, never by the
// model: each item is a branch a ticket names, with what it waits for.
//
//   onboarding — « PO détecte une Person incomplète et propose « Préparer les
//                fiches de renseignements » » (Juridique 02);
//   contract   — « PO affiche tous les besoins contractuels », an agreement
//                once the person's data is there (Juridique 03; 07:
//                « network_form.completed(Ever) : rendre l'accord Ever
//                READY_TO_GENERATE »);
//   splits     — a split sheet confirmed by each contributor (Juridique 04);
//   clearance  — a third-party element to secure (Juridique 05);
//   formality  — the SACEM declaration, which needs the creators' data, the
//                split and the clearances (Juridique 06).
//
// Columns of ticket 07: « À lancer maintenant », « En cours », « À venir /
// débloqué ensuite ». Nothing is forced into a line: an item waits only for
// what it really depends on (« aucune séquence artificiellement linéaire »).

import { fr } from "@/lib/i18n/fr";
import type { InventoryRows } from "@/lib/legal/inventory-rows";
import { titleItems } from "@/lib/legal/plan/proposal-titles";
import { featuredArtists, featuredKey } from "@/lib/legal/forms/people";
import { normalizeSearch } from "@/lib/utils/search";

export const PLAN_COLUMNS = ["now", "ongoing", "later"] as const;
export type PlanColumn = (typeof PLAN_COLUMNS)[number];

export type PlanItemKind =
  "onboarding" | "contract" | "splits" | "clearance" | "formality";

// Ticket 07's item states, as stored (legal_plan_items.status).
export type PlanItemStatus =
  "action_now" | "waiting_external" | "blocked" | "done" | "obsolete";

export type PlanItem = {
  key: string;
  kind: PlanItemKind;
  masterId: string | null;
  label: string;
  // Who or what it concerns (names, roles, the title).
  detail: string | null;
  // Why it exists, in one sentence.
  why: string;
  // Who or what it is about, alone (a person, a title): the line of a
  // grouped list.
  subject: string | null;
  // The credits a contract is for (its person's contact found from them).
  creditIds: string[];
  column: PlanColumn;
  status: PlanItemStatus;
  dependsOn: string[];
};

export type PlanClearance = {
  id: string;
  masterId: string | null;
  element: string;
  work: string;
  author: string | null;
  status: string;
};

// A clearance someone outside is answering: waiting, not to act on.
const CLEARANCE_WAITING = [
  "rightsholders_identified",
  "contacted",
  "waiting_external",
  "negotiating",
  "agreement_reached",
  "document_pending",
  "signed",
];

const t = fr.legal.plan.items;

export function proposePlan(input: {
  rows: InventoryRows;
  clearances: PlanClearance[];
  // Contacts whose fiche de renseignements is complete (Juridique 02).
  completeContacts: Set<string>;
}): PlanItem[] {
  const { rows } = input;
  const titleOf = new Map(rows.titles.map((m) => [m.id, m.title]));

  // Every credited person once, across the project's titles.
  const people = new Map<
    string,
    {
      name: string;
      contactId: string | null;
      roles: Set<string>;
      creditIds: string[];
    }
  >();
  for (const master of rows.titles)
    for (const credit of rows.creditsOf.get(master.id) ?? []) {
      const key = normalizeSearch(credit.name);
      const person = people.get(key) ?? {
        name: credit.name,
        contactId: credit.contactId,
        roles: new Set<string>(),
        creditIds: [],
      };
      person.contactId ??= credit.contactId;
      person.creditIds.push(credit.id);
      person.roles.add(fr.masterPage.credits.roles[credit.role]);
      people.set(key, person);
    }
  // A featured artist is contracted as a performer too (UX test of
  // 09/10/2026), on the person of their contact or as their own.
  for (const artist of featuredArtists(rows)) {
    const performer = fr.legalForms.roles.performer;
    const same = artist.contact
      ? [...people.values()].find((p) => p.contactId === artist.contact!.id)
      : undefined;
    if (same) {
      same.roles.add(performer);
      continue;
    }
    people.set(featuredKey(artist), {
      name: artist.contact?.name ?? artist.name,
      contactId: artist.contact?.id ?? null,
      roles: new Set([performer]),
      creditIds: [],
    });
  }

  // « PO détecte une Person incomplète » : no contact yet, or a fiche not
  // complete.
  const ficheMissing = (p: { contactId: string | null }) =>
    !p.contactId || !input.completeContacts.has(p.contactId);
  const incomplete = [...people.values()].filter(ficheMissing);
  const onboarding: PlanItem[] =
    incomplete.length > 0
      ? [
          {
            key: "onboarding",
            kind: "onboarding",
            masterId: null,
            label: t.onboarding(incomplete.length),
            detail: incomplete.map((p) => p.name).join(", "),
            why: t.onboardingWhy,
            subject: null,
            creditIds: [],
            column: "now",
            status: "action_now",
            dependsOn: [],
          },
        ]
      : [];
  const afterOnboarding = onboarding.length > 0 ? ["onboarding"] : [];

  const contracts = [...people.entries()].flatMap(
    ([key, person]): PlanItem[] => {
      const theirs = rows.contracts.filter(
        (c) => person.contactId && c.partyIds.includes(person.contactId),
      );
      if (theirs.some((c) => c.status === "signed")) return [];
      const running = theirs.some(
        (c) => c.status !== "terminated" && c.status !== "signed",
      );
      // « La réception de la fiche Ever ne débloque que l'accord Ever ».
      const waits = ficheMissing(person) ? afterOnboarding : [];
      return [
        {
          key: `contract:${key}`,
          kind: "contract",
          masterId: null,
          label: t.contract(person.name),
          detail: [...person.roles].join(" · "),
          why: t.contractWhy,
          subject: person.name,
          creditIds: person.creditIds,
          column: running ? "ongoing" : waits.length > 0 ? "later" : "now",
          status: running
            ? "waiting_external"
            : waits.length > 0
              ? "blocked"
              : "action_now",
          dependsOn: running ? [] : waits,
        },
      ];
    },
  );

  const clearances = input.clearances
    .filter((c) => c.status !== "cleared" && c.status !== "abandoned")
    .map((c): PlanItem => {
      const waiting = CLEARANCE_WAITING.includes(c.status);
      return {
        key: `clearance:${c.id}`,
        kind: "clearance",
        masterId: c.masterId,
        label: t.clearance(c.work),
        detail: [
          fr.legal.intake.facts.elements[
            c.element as keyof typeof fr.legal.intake.facts.elements
          ] ?? null,
          c.author,
          c.masterId && titleOf.has(c.masterId)
            ? t.clearanceDetail(titleOf.get(c.masterId) ?? "")
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
        why: t.clearanceWhy,
        subject: c.work,
        creditIds: [],
        column: waiting ? "ongoing" : "now",
        status: waiting ? "waiting_external" : "action_now",
        dependsOn: [],
      };
    });

  const perTitle = titleItems(rows, afterOnboarding, clearances);

  return [...onboarding, ...clearances, ...contracts, ...perTitle];
}
