// What a démarche's current step expects, and from whom (proto « Projet
// complet », Juridique: « Lina Haddad · vérifier les réponses », « Décision
// requise · Claire Morel · valider le document », « En attente d'Éditions
// Nocturne · répondre à la demande »). Read from the step's own source
// object (the fiche, the agreement, the borrowing, the split, the bulletin),
// never stored. Pure, client-safe.

import { legalDemarches } from "@/lib/i18n/fr/legal-demarches";
import type { BoardRow } from "@/lib/legal/plan/board";
import { isAwaitingAgreement } from "@/lib/legal/title-contracts-rules";

const fr = { legalDemarches };

const t = fr.legalDemarches.todo;

/** Who acts: the démarche's responsible, the direction (a decision), or
 * someone outside through their link or by e-mail. */
export type Expected =
  | { who: "owner"; todo: string }
  | { who: "direction"; todo: string }
  | { who: "outside"; name: string; todo: string; viaLink: boolean };

const outside = (name: string, todo: string, viaLink = true): Expected => ({
  who: "outside",
  name,
  todo,
  viaLink,
});
const owner = (todo: string): Expected => ({ who: "owner", todo });

const joinNames = (names: string[]) =>
  names.length <= 1
    ? (names[0] ?? "")
    : `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`;

/** A work or title as typed, without the guillemets a label adds. */
export const bare = (text: string) =>
  text
    .trim()
    .replace(/^[«"“]\s*/, "")
    .replace(/\s*[»"”]$/, "");

/** A step the plan tracks but whose source object does not exist yet (no
 * contract, no split, no bulletin): its first gesture, by the row's kind. */
function firstGesture(row: BoardRow): Expected {
  const subject = bare(row.label);
  switch (row.id.slice(0, row.id.indexOf(":"))) {
    case "contract":
      return owner(t.prepareContract(subject));
    case "clearance":
      return owner(t.ask(subject));
    case "splits":
      return owner(t.proposeSplit(subject));
    case "formality":
      return owner(t.bulletin(subject));
    default:
      return owner(t.open(subject));
  }
}

/** What the step behind a board row expects now; null when nothing (done,
 * or waiting for another démarche). Each gesture names its object
 * (« Préparer le contrat de Sami Kader »), never « Faire avancer la
 * démarche » alone. */
export function expectedOf(row: BoardRow): Expected | null {
  const panel = row.panel;
  if (row.group === "done") return null;
  switch (panel.kind) {
    case "fiche": {
      const f = panel.row;
      if (f.namesakeId) return owner(t.link(f.name));
      if (f.artistId) return owner(t.addToNetwork(f.name));
      if (f.state === "sent") return outside(f.name, t.fillFiche);
      if (f.state === "link_generated") return owner(t.markSent(f.name));
      if (f.state === "action_required" && f.complement)
        return outside(f.name, t.completeFiche);
      if (f.state === "action_required") return owner(t.review(f.name));
      return owner(t.prepareFiche(f.name));
    }
    case "contract": {
      const a = panel.row;
      switch (a.state) {
        case "unmapped":
          return owner(t.mapping(a.name));
        case "needs_info":
          return owner(t.missing(a.name));
        case "ready_to_generate":
          // A guest's contract waits for their accord: nobody acts on it.
          return isAwaitingAgreement(a) ? null : owner(t.generate(a.name));
        case "draft":
          return owner(t.submit(a.name));
        case "review_required":
          return { who: "direction", todo: t.validateDocument(a.name) };
        // Sent as validated: the person signs first (Ibé, 07/11/2026).
        case "ready_for_signature":
          return owner(t.send(a.name));
        case "signature_pending":
          // JUR-11: back signed, PDS signs, then the team checks.
          if (a.contract?.returned && !a.contract.countersigned)
            return { who: "direction", todo: t.countersign(a.name) };
          if (a.contract?.returned) return owner(t.checkSigned(a.name));
          return row.group === "waiting"
            ? outside(a.name, t.signContract)
            : owner(t.deposit(a.name));
        case "ended":
          return owner(t.decideContract(a.name));
        default:
          return owner(t.open(a.name));
      }
    }
    case "clearance": {
      const c = panel.clearance;
      const work = bare(c.work);
      const holders = joinNames(c.holders.map((h) => h.name));
      const them = holders || fr.legalDemarches.holders;
      if (c.terms.some((x) => x.status === "proposed"))
        return { who: "direction", todo: t.validateTerms(work) };
      switch (c.status) {
        case "to_investigate":
        case "rightsholders_identified":
          return owner(t.ask(work));
        case "contacted":
        case "waiting_external":
          return outside(them, t.answer, false);
        case "negotiating":
          return row.group === "waiting"
            ? outside(them, t.answer, false)
            : owner(t.reply(work));
        case "agreement_reached":
        case "document_pending":
          return row.group === "waiting"
            ? outside(them, t.signLicence, false)
            : owner(t.sendLicence(work));
        case "signed":
          return owner(t.secure(work));
        case "refused":
        case "action_required":
          return owner(t.decide(work));
        default:
          return owner(t.open(work));
      }
    }
    case "split": {
      const s = panel.split;
      const title = bare(s.title);
      const status = s.active?.status;
      if (status === "disputed") return owner(t.disputed(title));
      if (status === "proposed" || status === "partially_confirmed") {
        const names = (s.active?.lines ?? [])
          .filter((l) => l.contactId && l.confirmation.state !== "confirmed")
          .map((l) => l.name);
        return names.length > 0
          ? outside(joinNames(names), t.confirmSplit)
          : owner(t.confirmSplitOwn(title));
      }
      return owner(s.draft ? t.sendSplit(title) : t.proposeSplit(title));
    }
    case "sacem": {
      const title = bare(panel.title.title);
      switch (panel.title.formality?.status) {
        case "document_ready":
        case "signatures_pending":
          return owner(t.signatures(title));
        case "ready_to_submit":
          return owner(t.file(title));
        case "submitted":
        case "processing":
          return outside(fr.legalDemarches.sacemOrg, t.sacemAnswer, false);
        case "action_required":
        case "rejected":
          return owner(t.correct(title));
        default:
          return owner(t.bulletin(title));
      }
    }
    // Planned, its source object not created yet (lib/legal/plan/board.ts).
    default:
      return firstGesture(row);
  }
}
