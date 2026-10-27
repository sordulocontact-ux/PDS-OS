// Where one action of the Suivi stands, read from its source object
// (ticket Juridique 07: « Une Rule lit les objets sources »): the Réseau for
// the fiches, the project's contracts, the title's publishing split and
// SACEM declaration, the clearance. Pure.

import { routes } from "@/lib/auth/redirects";
import { legalDemarcheHref } from "@/lib/ui/legal-steps";
import { contractStateOf } from "@/lib/contracts/types";
import { contracts } from "@/lib/i18n/fr/contracts";
import { legal } from "@/lib/i18n/fr/legal";
import type { InventoryRows } from "@/lib/legal/inventory-rows";
import type { InventoryContributor } from "@/lib/legal/people-facts";
import type { PlanItemStatus } from "@/lib/legal/plan/proposal";
import type { PlanRow } from "@/lib/legal/plan/queries";
import type { SplitState } from "@/lib/legal/splits/queries";
import { titlePublishingLines } from "@/lib/legal/splits/shares";
import { normalizeSearch } from "@/lib/utils/search";

const fr = { contracts, legal };

export type TrackClearance = {
  id: string;
  status: string;
  updatedAt: string;
  // Conditions received wait for the direction: a decision, not a wait.
  termsPending?: boolean;
};

export type Source = {
  status: PlanItemStatus;
  // A refusal, a rejection, a terminated contract, a decision awaited.
  decision?: boolean;
  reason: string;
  since?: string | null;
  href: string | null;
};

export type SourceContext = {
  projectId: string;
  rows: InventoryRows;
  clearances: TrackClearance[];
  today: string;
  titleIds: Set<string>;
  credits: InventoryContributor[];
  // Normalized name → the person's contact, once linked.
  contactOf: Map<string, string | null>;
  // Contacts whose fiche de renseignements is complete (Juridique 02).
  completeContacts: Set<string>;
  // Each title's active split sheet (Juridique 04).
  splitOf: Map<string, SplitState>;
};

export function sourceContext(input: {
  projectId: string;
  rows: InventoryRows;
  clearances: TrackClearance[];
  today: string;
  completeContacts: Set<string>;
  splitOf: Map<string, SplitState>;
}): SourceContext {
  const credits = [...input.rows.creditsOf.values()].flat();
  const contactOf = new Map<string, string | null>();
  for (const c of credits) {
    const key = normalizeSearch(c.name);
    contactOf.set(key, contactOf.get(key) ?? c.contactId);
  }
  return {
    ...input,
    titleIds: new Set(input.rows.titles.map((m) => m.id)),
    credits,
    contactOf,
  };
}

const t = fr.legal.tracking.reasons;
const CLEARANCE_WAITING = [
  "rightsholders_identified",
  "contacted",
  "waiting_external",
  "negotiating",
  "agreement_reached",
  "document_pending",
  "signed",
];

export function itemSource(
  item: PlanRow,
  depsDone: boolean,
  ctx: SourceContext,
): Source {
  const { rows, projectId, titleIds, credits, contactOf } = ctx;
  // "contract:ever" → kind "contract", ref "ever" (a ref may hold ":").
  const colon = item.key.indexOf(":");
  const kind = colon < 0 ? item.key : item.key.slice(0, colon);
  const ref = colon < 0 ? "" : item.key.slice(colon + 1);
  const waitOr = (reason: string, href: string | null): Source =>
    depsDone
      ? { status: "action_now", reason, href }
      : { status: "blocked", reason: t.waitsForOthers, href };

  if (kind === "onboarding") {
    // Done when every credited person's fiche is complete.
    const href = routes.projectLegalStep(projectId, "forms");
    const missing = new Set(
      credits
        .filter((c) => !c.contactId || !ctx.completeContacts.has(c.contactId))
        .map((c) => normalizeSearch(c.name)),
    );
    return missing.size === 0
      ? { status: "done", reason: t.allFichesComplete, href }
      : { status: "action_now", reason: t.fichesMissing(missing.size), href };
  }
  if (kind === "contract") {
    // Every state of a person's contract is done in their démarche.
    const person = legalDemarcheHref(projectId, "person", ref);
    if (!contactOf.has(ref))
      return { status: "obsolete", reason: t.noLongerCredited, href: null };
    const contactId = contactOf.get(ref);
    const theirs = rows.contracts.filter(
      (c) => contactId && c.partyIds.includes(contactId),
    );
    const states = theirs.map((c) => ({
      c,
      state: contractStateOf(c, ctx.today),
    }));
    const pick = (s: string) => states.find((x) => x.state === s);
    const signed = pick("signed");
    if (signed)
      return {
        status: "done",
        reason: t.signed,
        href: person,
      };
    const sent = pick("sent");
    // Back signed by the person: PDS signs, then the team checks (JUR-11).
    if (sent?.c.returned)
      return sent.c.countersigned
        ? { status: "action_now", reason: t.signatureToCheck, href: person }
        : {
            status: "waiting_external",
            decision: true,
            reason: t.awaitingCountersign,
            href: person,
          };
    if (sent)
      return {
        status: "waiting_external",
        reason: t.sentForSignature,
        since: sent.c.updatedAt,
        href: person,
      };
    const review = pick("in_review");
    if (review)
      return {
        status: "waiting_external",
        decision: true,
        reason: t.awaitingDirector,
        href: person,
      };
    const draft = pick("draft") ?? pick("approved");
    if (draft)
      return {
        status: "action_now",
        reason: fr.contracts.states[draft.state],
        href: person,
      };
    const ended = pick("expired") ?? pick("terminated");
    if (ended)
      return {
        status: "action_now",
        decision: true,
        reason: fr.contracts.states[ended.state],
        href: person,
      };
    // « La réception de la fiche Ever ne débloque que l'accord Ever »
    // (Juridique 07): a contract waits for its own person's fiche only.
    return contactId && ctx.completeContacts.has(contactId)
      ? {
          status: "action_now",
          reason: t.noContract,
          href: person,
        }
      : {
          status: "blocked",
          reason: t.waitsForFiche,
          href: person,
        };
  }
  if (kind === "splits") {
    if (!titleIds.has(ref))
      return { status: "obsolete", reason: t.titleRemoved, href: null };
    // Done once every person confirmed the active version (Juridique 04).
    const href = legalDemarcheHref(projectId, "split", ref);
    const split = ctx.splitOf.get(ref);
    if (split?.status === "confirmed")
      return { status: "done", reason: t.splitConfirmed, href };
    if (split?.status === "disputed")
      return {
        status: "action_now",
        decision: true,
        reason: t.splitDisputed,
        href,
      };
    if (split)
      return {
        status: "waiting_external",
        reason: t.splitWaiting(split.confirmed, split.total),
        since: split.since,
        href,
      };
    return waitOr(
      titlePublishingLines(rows.splitsOf.get(ref) ?? [])
        ? t.splitOnTitle
        : t.splitToDo,
      href,
    );
  }
  if (kind === "clearance") {
    const clearance = ctx.clearances.find((c) => c.id === ref);
    const href = legalDemarcheHref(projectId, "clearance", ref);
    if (!clearance || clearance.status === "abandoned")
      return { status: "obsolete", reason: t.clearanceGone, href: null };
    if (clearance.status === "cleared")
      return { status: "done", reason: t.cleared, href };
    if (["refused", "action_required"].includes(clearance.status))
      return {
        status: "action_now",
        decision: true,
        reason: t.clearance[clearance.status as "refused" | "action_required"],
        href,
      };
    if (clearance.termsPending)
      return {
        status: "action_now",
        decision: true,
        reason: t.clearanceTermsPending,
        href,
      };
    if (CLEARANCE_WAITING.includes(clearance.status))
      return {
        status: "waiting_external",
        reason: t.clearanceWaiting,
        since: clearance.updatedAt,
        href,
      };
    return { status: "action_now", reason: t.toInvestigate, href };
  }
  // formality (SACEM declaration of a title)
  if (!titleIds.has(ref))
    return { status: "obsolete", reason: t.titleRemoved, href: null };
  const sacem = rows.filedOf.get(ref)?.get("sacem");
  if (sacem?.status === "confirmed")
    return {
      status: "done",
      reason: t.declared,
      href: legalDemarcheHref(projectId, "sacem", ref),
    };
  if (sacem?.status === "submitted")
    return {
      status: "waiting_external",
      reason: t.submitted,
      since: sacem.date,
      href: legalDemarcheHref(projectId, "sacem", ref),
    };
  if (sacem?.status === "rejected")
    return {
      status: "action_now",
      decision: true,
      reason: t.rejected,
      href: legalDemarcheHref(projectId, "sacem", ref),
    };
  return waitOr(t.toDeclare, legalDemarcheHref(projectId, "sacem", ref));
}
