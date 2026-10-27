// What a démarche's current step expects, and from whom (proto « Projet
// complet », Juridique: « Lina Haddad · vérifier les réponses », « Décision
// requise · Claire Morel · valider le document », « En attente d'Éditions
// Nocturne · répondre à la demande »). Read from the step's own source
// object (the fiche, the agreement, the borrowing, the split, the bulletin),
// never stored. Pure, client-safe.

import { legalDemarches } from "@/lib/i18n/fr/legal-demarches";
import type { BoardRow } from "@/lib/legal/plan/board";

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

/** What the step behind a board row expects now; null when nothing (done,
 * or waiting for another démarche). */
export function expectedOf(row: BoardRow): Expected | null {
  const panel = row.panel;
  if (row.group === "done") return null;
  switch (panel.kind) {
    case "fiche": {
      const f = panel.row;
      if (f.namesakeId) return owner(t.link);
      if (f.artistId) return owner(t.addToNetwork);
      if (f.state === "sent") return outside(f.name, t.fillFiche);
      if (f.state === "link_generated") return owner(t.markSent);
      if (f.state === "action_required" && f.complement)
        return outside(f.name, t.completeFiche);
      if (f.state === "action_required") return owner(t.review);
      return owner(t.prepareFiche);
    }
    case "contract": {
      const a = panel.row;
      switch (a.state) {
        case "unmapped":
          return owner(t.mapping);
        case "needs_info":
          return owner(t.missing);
        case "ready_to_generate":
          return owner(t.generate);
        case "draft":
          return owner(t.submit);
        case "review_required":
          return { who: "direction", todo: t.validateDocument };
        case "ready_for_signature":
          return owner(t.send);
        case "signature_pending":
          // JUR-11: back signed, PDS signs, then the team checks.
          if (a.contract?.returned && !a.contract.countersigned)
            return { who: "direction", todo: t.countersign };
          if (a.contract?.returned) return owner(t.checkSigned);
          return row.group === "waiting"
            ? outside(a.name, t.signContract)
            : owner(t.deposit);
        default:
          return owner(t.open);
      }
    }
    case "clearance": {
      const c = panel.clearance;
      const holders = joinNames(c.holders.map((h) => h.name));
      const them = holders || fr.legalDemarches.holders;
      if (c.terms.some((x) => x.status === "proposed"))
        return { who: "direction", todo: t.validateTerms };
      switch (c.status) {
        case "to_investigate":
        case "rightsholders_identified":
          return owner(t.ask);
        case "contacted":
        case "waiting_external":
          return outside(them, t.answer, false);
        case "negotiating":
          return row.group === "waiting"
            ? outside(them, t.answer, false)
            : owner(t.reply);
        case "agreement_reached":
        case "document_pending":
          return row.group === "waiting"
            ? outside(them, t.signLicence, false)
            : owner(t.sendLicence);
        case "signed":
          return owner(t.secure);
        case "refused":
        case "action_required":
          return owner(t.decide);
        default:
          return owner(t.open);
      }
    }
    case "split": {
      const s = panel.split;
      const status = s.active?.status;
      if (status === "disputed") return owner(t.disputed);
      if (status === "proposed" || status === "partially_confirmed") {
        const names = (s.active?.lines ?? [])
          .filter((l) => l.contactId && l.confirmation.state !== "confirmed")
          .map((l) => l.name);
        return names.length > 0
          ? outside(joinNames(names), t.confirmSplit)
          : owner(t.confirmSplit);
      }
      return owner(s.draft ? t.sendSplit : t.proposeSplit);
    }
    case "sacem": {
      switch (panel.title.formality?.status) {
        case "document_ready":
        case "signatures_pending":
          return owner(t.signatures);
        case "ready_to_submit":
          return owner(t.file);
        case "submitted":
        case "processing":
          return outside(fr.legalDemarches.sacemOrg, t.sacemAnswer, false);
        case "action_required":
        case "rejected":
          return owner(t.correct);
        default:
          return owner(t.bulletin);
      }
    }
    default:
      return owner(t.open);
  }
}
