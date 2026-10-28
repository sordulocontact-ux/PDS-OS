// The causal chain of the Historique du Juridique (JUR-29), by explicit
// rule, never guessed: an event follows the latest earlier event of the
// same object whose kind may lead to it (asked → revised → submitted →
// approved → signature asked → signed…). A SACEM bulletin generated again
// makes the signatures of the version before it void: said on the
// generation. Pure, client-safe.

import { legalHistory } from "@/lib/i18n/fr/legal-history";
import type { LegalEvent } from "@/lib/legal/history/types";

const fr = { legalHistory };

// kind → the kinds it may follow, on the same object.
const FOLLOWS: Record<string, string[]> = {
  // Contracts.
  "contract.submitted": ["contract.generated", "contract.revised"],
  "contract.approved": ["contract.submitted"],
  "contract.changes_requested": ["contract.submitted"],
  "contract.revised": ["contract.changes_requested", "contract.generated"],
  "contract.countersign_voided": ["contract.revised"],
  "signature.requested": ["contract.approved"],
  "contract.signed": ["signature.requested", "contract.approved"],
  "contract.terminated": ["contract.signed"],
  "invoice.received": ["contract.signed"],
  "invoice.paid": ["invoice.received"],
  // Fiches de renseignements.
  "form.sent": ["form.prepared"],
  "form.submitted": ["form.sent", "form.prepared"],
  "form.completed": ["form.submitted"],
  "form.revoked": ["form.sent", "form.prepared"],
  // Split sheets: a dispute leads to a new version, to propose again.
  "split.proposed": ["split.version_created"],
  "split.confirmed": ["split.proposed"],
  "split.disputed": ["split.proposed"],
  "split.version_created": ["split.disputed", "split.confirmed"],
  "split.confirmation_revoked": ["split.version_created", "split.proposed"],
  // SACEM.
  "formality.ready": ["formality.values_validated"],
  "document.generated": ["formality.ready", "formality.action_required"],
  signature: ["document.generated"],
  "formality.partial": ["signature", "document.generated"],
  "formality.submitted": ["signature", "document.generated"],
  "formality.processing": ["formality.submitted"],
  "formality.action_required": ["formality.submitted", "formality.processing"],
  "formality.completed": ["formality.submitted", "formality.processing"],
  // Plan d'action.
  "plan.launched": ["plan.confirmed"],
};

/** The events, newest first, with their cause and what they made void. */
export function linkCauses(events: LegalEvent[]): LegalEvent[] {
  const t = fr.legalHistory.causes;
  const byObject = new Map<string, LegalEvent[]>();
  // Oldest first, per object.
  for (const e of [...events].reverse())
    if (e.object)
      byObject.set(e.object, [...(byObject.get(e.object) ?? []), e]);

  const extra = new Map<string, Partial<LegalEvent>>();
  for (const list of byObject.values()) {
    let generated = 0;
    list.forEach((e, index) => {
      const kinds = FOLLOWS[e.kind];
      const cause = kinds
        ? list
            .slice(0, index)
            .reverse()
            .find((x) => kinds.includes(x.kind))
        : undefined;
      const add: Partial<LegalEvent> = cause ? { causeId: cause.id } : {};
      if (e.kind === "document.generated") {
        generated += 1;
        const signed = list
          .slice(0, index)
          .filter(
            (x) => x.kind === "signature" && x.version === generated - 1,
          ).length;
        if (generated > 1 && signed > 0)
          add.consequence = t.signaturesVoided(generated - 1, signed);
      }
      if (cause || add.consequence) extra.set(e.id, add);
    });
  }
  return events.map((e) => ({ ...e, ...extra.get(e.id) }));
}
