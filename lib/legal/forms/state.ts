// Where a fiche stands, in the words of the recette (JUR-06): à créer,
// envoyée, en attente (ouverte, pas renvoyée ; complément demandé), à
// vérifier (incomplète ; corrections), complète à valider, validée. One
// place for its pill, the board and the démarche. Client-safe, pure.

import { legal } from "@/lib/i18n/fr/legal";
import { legalForms } from "@/lib/i18n/fr/legal-forms";
import { ficheMissing } from "@/lib/legal/forms/completeness";
import type { FormRow } from "@/lib/legal/forms/queries";
import type { Tone } from "@/lib/ui/state-tones";

const fr = { legal, legalForms };

export type FicheStatus =
  | "toCreate"
  | "toSend"
  | "sent"
  | "opened"
  | "complement"
  | "incomplete"
  | "corrections"
  | "toValidate"
  | "validated"
  | "expired"
  | "revoked";

const TONE: Record<FicheStatus, Tone> = {
  toCreate: "neutral",
  toSend: "info",
  sent: "info",
  opened: "warning",
  complement: "warning",
  incomplete: "danger",
  corrections: "warning",
  toValidate: "info",
  validated: "success",
  expired: "danger",
  revoked: "neutral",
};

type FicheInput = Pick<
  FormRow,
  "state" | "openedAt" | "submission" | "complement"
>;

export function ficheStatusOf(row: FicheInput): FicheStatus {
  switch (row.state) {
    case "none":
      return "toCreate";
    case "link_generated":
      return "toSend";
    case "sent":
      return row.openedAt ? "opened" : "sent";
    case "complete":
      return "validated";
    case "expired":
      return "expired";
    case "revoked":
      return "revoked";
    case "action_required":
      if (row.complement) return "complement";
      if (row.submission && ficheMissing(row.submission).length > 0)
        return "incomplete";
      if (row.submission && Object.keys(row.submission.corrections).length > 0)
        return "corrections";
      return "toValidate";
  }
}

/** The fiche's pill: its words and tone. */
export function ficheBadge(row: FicheInput): { label: string; tone: Tone } {
  const status = ficheStatusOf(row);
  return { label: fr.legalForms.page.status[status], tone: TONE[status] };
}

/** The sentence under the fiche's title in its démarche, when its state
 * asks for one (a link to send by hand). */
export function ficheLead(row: Pick<FormRow, "state" | "name">): string | null {
  return row.state === "link_generated"
    ? fr.legal.panels.fiche.sendYourself(row.name)
    : null;
}

/** The labels of what is missing, for a sentence. */
export const missingLabels = (ids: string[]) =>
  ids.map((id) => fr.legalForms.fields[id] ?? id).join(", ");
